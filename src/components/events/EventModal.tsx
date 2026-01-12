import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const eventSchema = z.object({
    title: z.string().min(1, "Titulo e obrigatorio"),
    description: z.string().optional(),
    event_date: z.string().min(1, "Data e obrigatoria"),
    event_time: z.string().min(1, "Hora e obrigatoria"),
    duration_minutes: z.coerce.number().min(5).default(60),
    location: z.string().optional(),
    meeting_link: z.string().url("URL invalida").or(z.literal("")).optional(),
    event_type: z.string().default("meeting"),
    color: z.string().default("#D4AF37"),
});

type EventFormValues = z.infer<typeof eventSchema>;

export interface Event {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    event_time: string;
    duration_minutes: number;
    location: string | null;
    meeting_link: string | null;
    event_type: string;
    color: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event?: Event | null;
    onSuccess: () => void;
    defaultDate?: string;
}

const eventTypes = [
    { value: "meeting", label: "Reuniao" },
    { value: "one-on-one", label: "One-on-one" },
    { value: "deadline", label: "Prazo" },
    { value: "reminder", label: "Lembrete" },
];

const colors = [
    { value: "#D4AF37", label: "Dourado" },
    { value: "#3B82F6", label: "Azul" },
    { value: "#10B981", label: "Verde" },
    { value: "#EF4444", label: "Vermelho" },
    { value: "#8B5CF6", label: "Roxo" },
    { value: "#F97316", label: "Laranja" },
];

export function EventModal({ isOpen, onClose, event, onSuccess, defaultDate }: EventModalProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventSchema),
        defaultValues: {
            title: "",
            description: "",
            event_date: defaultDate || new Date().toISOString().split("T")[0],
            event_time: "09:00",
            duration_minutes: 60,
            location: "",
            meeting_link: "",
            event_type: "meeting",
            color: "#D4AF37",
        },
    });

    useEffect(() => {
        if (event) {
            form.reset({
                title: event.title,
                description: event.description || "",
                event_date: event.event_date,
                event_time: event.event_time.slice(0, 5),
                duration_minutes: event.duration_minutes,
                location: event.location || "",
                meeting_link: event.meeting_link || "",
                event_type: event.event_type,
                color: event.color,
            });
        } else {
            form.reset({
                title: "",
                description: "",
                event_date: defaultDate || new Date().toISOString().split("T")[0],
                event_time: "09:00",
                duration_minutes: 60,
                location: "",
                meeting_link: "",
                event_type: "meeting",
                color: "#D4AF37",
            });
        }
    }, [event, form, isOpen, defaultDate]);

    async function onSubmit(values: EventFormValues) {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (event) {
                const { error } = await supabase
                    .from("events")
                    .update({
                        title: values.title,
                        description: values.description || null,
                        event_date: values.event_date,
                        event_time: values.event_time,
                        duration_minutes: values.duration_minutes,
                        location: values.location || null,
                        meeting_link: values.meeting_link || null,
                        event_type: values.event_type,
                        color: values.color,
                    })
                    .eq("id", event.id);

                if (error) throw error;
                toast.success("Evento atualizado!");
            } else {
                const { error } = await supabase
                    .from("events")
                    .insert([{
                        title: values.title,
                        description: values.description || null,
                        event_date: values.event_date,
                        event_time: values.event_time,
                        duration_minutes: values.duration_minutes,
                        location: values.location || null,
                        meeting_link: values.meeting_link || null,
                        event_type: values.event_type,
                        color: values.color,
                        created_by: user?.id,
                    }]);

                if (error) throw error;
                toast.success("Evento criado!");
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error("Erro ao salvar evento: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {event ? "Editar Evento" : "Novo Evento"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Titulo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Reuniao de equipe" {...field} className="rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="event_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} className="rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="event_time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hora</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} className="rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="duration_minutes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duracao (min)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={5} step={5} {...field} className="rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="event_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {eventTypes.map(type => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Local</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Sala de reunioes" {...field} className="rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="meeting_link"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link da reuniao</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://meet.google.com/..." {...field} className="rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cor</FormLabel>
                                    <div className="flex gap-2">
                                        {colors.map(color => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => field.onChange(color.value)}
                                                className={`w-8 h-8 rounded-full transition-all ${
                                                    field.value === color.value
                                                        ? "ring-2 ring-offset-2 ring-accent scale-110"
                                                        : "hover:scale-105"
                                                }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.label}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descricao</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Detalhes do evento..." {...field} className="rounded-xl min-h-[80px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="rounded-xl bg-accent hover:bg-accent/90">
                                {loading ? "Salvando..." : "Salvar Evento"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
