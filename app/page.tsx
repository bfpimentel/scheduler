import Scheduling from "@/components/scheduling";
import { Toaster } from "@/components/ui/toaster";

export default function Page() {
  return (
    <html lang="en">
      <head />
      <body>
        <main className="min-h-screen bg-background flex flex-col">
          <header className="border-b">
            <div className="container mx-auto py-4">
              <h1 className="text-2xl font-bold">Gerador de escala</h1>
            </div>
          </header>
          <Scheduling />
        </main>
        <Toaster />
      </body>
    </html>
  );
}
