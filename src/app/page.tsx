import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/20 p-4 text-primary">
          <Users className="h-12 w-12" />
        </div>
        <h1 className="font-headline text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          HiweWalk
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Create and join public rooms. Share your thoughts, collaborate on ideas, and connect with others in real-time.
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg" className="transition-transform hover:scale-105">
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="transition-transform hover:scale-105">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
       <div className="mt-12">
         <Button asChild variant="link">
           <Link href="/create-room">Create a Room (Test Link)</Link>
         </Button>
      </div>
    </main>
  );
}
