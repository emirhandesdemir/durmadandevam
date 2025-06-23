"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  roomName: z.string().min(3, { message: "Room name must be at least 3 characters." }),
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }),
});

export default function CreateRoomForm() {
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            roomName: "",
            topic: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values);
        // Simulate successful room creation
        toast({
            title: "Room Created!",
            description: `The room "${values.roomName}" on "${values.topic}" is now live.`,
        });
        form.reset();
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Create a New Room</CardTitle>
                <CardDescription>
                    Fill in the details below to start a new public room.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="roomName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Room Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Weekend Gamers" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="topic"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Topic</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Co-op Gaming" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">Create Room</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
