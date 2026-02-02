import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  category: string | null;
  assignee: string | null;
  assigned_to_id: string | null;
  due_date: string | null;
  due_time: string | null;
  recurrence: string | null;
  recurrence_end_date: string | null;
  position: number | null;
}

function addDaysToDate(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

// Skip weekends: if date falls on Saturday (6) or Sunday (0), move to Monday
function skipWeekend(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const dayOfWeek = date.getDay();
  
  if (dayOfWeek === 6) {
    // Saturday -> move to Monday (+2 days)
    date.setDate(date.getDate() + 2);
  } else if (dayOfWeek === 0) {
    // Sunday -> move to Monday (+1 day)
    date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split("T")[0];
}

function getNextDueDate(currentDueDate: string, recurrenceType: string): string {
  const daysToAdd: Record<string, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    semiannual: 182,
    yearly: 365,
  };
  const nextDate = addDaysToDate(currentDueDate, daysToAdd[recurrenceType] || 1);
  // Always skip weekends for all recurrence types
  return skipWeekend(nextDate);
}

function isDatePastOrToday(dateStr: string, today: string): boolean {
  return dateStr <= today;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in YYYY-MM-DD format (using Brasilia timezone)
    const now = new Date();
    const brasiliaOffset = -3 * 60; // UTC-3
    const utcOffset = now.getTimezoneOffset();
    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset - utcOffset) * 60000);
    const today = brasiliaTime.toISOString().split("T")[0];

    console.log(`[process-task-recurrence] Starting recurrence processing for date: ${today}`);

    // Find all recurring tasks that:
    // 1. Have a recurrence type set (not 'none' or null)
    // 2. Are completed
    // 3. Have a due date that is today or in the past
    // 4. Either have no recurrence_end_date or the end date is in the future
    const { data: completedRecurringTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("completed", true)
      .not("recurrence", "is", null)
      .neq("recurrence", "none")
      .lte("due_date", today);

    if (fetchError) {
      console.error("[process-task-recurrence] Error fetching tasks:", fetchError);
      throw fetchError;
    }

    console.log(`[process-task-recurrence] Found ${completedRecurringTasks?.length || 0} completed recurring tasks`);

    const createdTasks: string[] = [];
    const skippedTasks: string[] = [];

    for (const task of completedRecurringTasks || []) {
      // Skip if recurrence end date has passed
      if (task.recurrence_end_date && task.recurrence_end_date < today) {
        console.log(`[process-task-recurrence] Skipping task "${task.title}" - recurrence ended on ${task.recurrence_end_date}`);
        skippedTasks.push(task.id);
        continue;
      }

      // Calculate the next due date
      const nextDueDate = getNextDueDate(task.due_date, task.recurrence);

      // Skip if the next due date is past the recurrence end date
      if (task.recurrence_end_date && nextDueDate > task.recurrence_end_date) {
        console.log(`[process-task-recurrence] Skipping task "${task.title}" - next date ${nextDueDate} exceeds end date ${task.recurrence_end_date}`);
        skippedTasks.push(task.id);
        continue;
      }

      // Check if a task with this parent and due date already exists
      const { data: existingTask } = await supabase
        .from("tasks")
        .select("id")
        .eq("parent_task_id", task.id)
        .eq("due_date", nextDueDate)
        .single();

      if (existingTask) {
        console.log(`[process-task-recurrence] Task "${task.title}" for ${nextDueDate} already exists`);
        skippedTasks.push(task.id);
        continue;
      }

      // Create the new recurring instance
      const newTask = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        assignee: task.assignee,
        assigned_to_id: task.assigned_to_id,
        due_date: nextDueDate,
        due_time: task.due_time,
        recurrence: task.recurrence,
        recurrence_end_date: task.recurrence_end_date,
        parent_task_id: task.id,
        is_recurring_instance: true,
        completed: false,
        position: task.position,
      };

      const { data: insertedTask, error: insertError } = await supabase
        .from("tasks")
        .insert(newTask)
        .select()
        .single();

      if (insertError) {
        console.error(`[process-task-recurrence] Error creating task for "${task.title}":`, insertError);
        continue;
      }

      console.log(`[process-task-recurrence] Created new recurring task "${task.title}" for ${nextDueDate}`);
      createdTasks.push(insertedTask.id);

      // Also record in task_history
      await supabase.from("task_history").insert({
        task_id: insertedTask.id,
        action: "created",
        field_changed: "recurrence",
        new_value: `Criada automaticamente a partir de tarefa recorrente (${task.recurrence})`,
      });
    }

    const response = {
      success: true,
      date: today,
      tasksProcessed: completedRecurringTasks?.length || 0,
      tasksCreated: createdTasks.length,
      tasksSkipped: skippedTasks.length,
      createdTaskIds: createdTasks,
    };

    console.log(`[process-task-recurrence] Completed: ${createdTasks.length} tasks created, ${skippedTasks.length} skipped`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[process-task-recurrence] Error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
