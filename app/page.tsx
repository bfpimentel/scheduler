"use client";

import { useState, useRef, useMemo } from "react";
import { CalendarIcon, PlusCircle, X, Upload, Download } from "lucide-react";
import {
  parse,
  isEqual,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  isSaturday,
  isSunday,
  isFriday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  cn,
  formatLocalized,
  randomInt,
  handleTextFileExport,
} from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = {
  id: number;
  name: string;
  unavailableDates: Date[];
};

type Schedule = {
  date: Date;
  members: string[];
};

type Confirmation = {
  isOpen: boolean;
  confirmAction: () => void;
  cancelAction: () => void;
  description: string;
};

export default function Page() {
  const availableMonths: Date[] = Array.from({ length: 12 }, (_, i: number) =>
    addMonths(new Date(), i),
  );

  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<Date>(availableMonths[0]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation>({
    isOpen: false,
    confirmAction: () => {},
    cancelAction: () => {},
    description: "",
  });

  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthDates = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const handleMonthSelection = (monthValue: string) => {
    if (monthValue && monthValue != "") {
      setSelectedMonth(
        parse(monthValue, "MMMM 'de' yyyy", new Date(), {
          locale: ptBR,
        }),
      );
    }
  };

  const handleAddDate = () => {
    if (
      currentDate &&
      !unavailableDates.some((date) => isEqual(date, currentDate))
    ) {
      setUnavailableDates([...unavailableDates, currentDate]);
      setCurrentDate(undefined);
    }
  };

  const handleRemoveDate = (dateToRemove: Date) => {
    setUnavailableDates(
      unavailableDates.filter((date) => !isEqual(date, dateToRemove)),
    );
  };

  const updateMember = (name: string, newUnavailableDates: Date[]) => {
    setMembers((prevMembers) => {
      const existingMemberIndex = prevMembers.findIndex(
        (m) => m.name.toLowerCase() === name.toLowerCase(),
      );
      if (existingMemberIndex !== -1) {
        const existingMember = prevMembers[existingMemberIndex];
        const updatedDates = [
          ...existingMember.unavailableDates,
          ...newUnavailableDates.filter(
            (newDate) =>
              !existingMember.unavailableDates.some((existingDate) =>
                isEqual(existingDate, newDate),
              ),
          ),
        ];
        return [
          ...prevMembers.slice(0, existingMemberIndex),
          { ...existingMember, unavailableDates: updatedDates },
          ...prevMembers.slice(existingMemberIndex + 1),
        ];
      } else {
        return [
          ...prevMembers,
          { id: Date.now(), name, unavailableDates: newUnavailableDates },
        ];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      updateMember(name, unavailableDates ?? []);
      setName("");
      setUnavailableDates([]);
      toast({
        title: "Membro atualizado",
        description: `As datas de indisponibilidade do membro ${name} foram atualizadas para ${formatLocalized(selectedMonth, "MMMM 'de' yyyy")}.`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const lines = content.split("\n");
        let hasSetMonth = false;

        lines.forEach((line) => {
          const [name, ...dateParts] = line.split(",");
          const dates = dateParts
            .map((datePart) => parse(datePart.trim(), "yyyy-MM-dd", new Date()))
            .filter(
              (date) =>
                !isNaN(date.getTime()) &&
                monthDates.some((monthDate) => isEqual(monthDate, date)),
            );

          if (name) {
            if (dates.length > 0 && !hasSetMonth) {
              setSelectedMonth(dates[0]);
              setMembers([]);
              hasSetMonth = true;
            }

            updateMember(name.trim(), dates ?? []);
          }
        });
        toast({
          title: "Arquivo processado",
          description: `Membros e suas respectivas datas de indisponbilidade foram atualizados para ${formatLocalized(selectedMonth, "MMMM 'de' yyyy")}.`,
        });
      };
      reader.readAsText(file);
    }
  };

  const handleMembersAndDatesExport = () => {
    const content = members
      .map((member) => {
        const datesFormatted = member.unavailableDates
          .map((date) => formatLocalized(date, "yyyy-MM-dd"))
          .join(", ");
        return `${member.name}, ${datesFormatted}`;
      })
      .join("\n");

    handleTextFileExport(
      content,
      `membros_${formatLocalized(selectedMonth, "yyyy-MM")}`,
      "Arquivo exportado",
      `${members.length} membros e suas respectivas datas de indispobilidade para ${formatLocalized(selectedMonth, "MMMM 'de' yyyy")} foram exportados.`,
    );
  };

  const handleMembersOnlyExport = () => {
    const content = members.map((member) => member.name).join("\n");

    handleTextFileExport(
      content,
      "membros",
      "Arquivo exportado",
      `${members.length} foram exportados.`,
    );
  };

  const generateScheduleOutput = (): string => {
    return schedule
      .map(
        (schedule) =>
          `*${formatLocalized(schedule.date, "EEEE, dd MMM")}*\n` +
          schedule.members.map((member) => member).join("\n"),
      )
      .join("\n\n");
  };

  const handleScheduleExport = () => {
    const formattedDate = formatLocalized(schedule[0].date, "yyyy-MM");

    handleTextFileExport(
      generateScheduleOutput(),
      `escala_${formattedDate}`,
      "Arquivo exportado",
      `Escala para ${formattedDate} foi exportada.`,
    );
  };

  const handleScheduleCopy = () => {
    const formattedDate = formatLocalized(schedule[0].date, "yyyy-MM");

    navigator.clipboard.writeText(generateScheduleOutput());

    toast({
      title: "Escala copiada",
      description: `Escala para ${formattedDate} foi copiada para a área de transferência.`,
    });
  };

  const generateSchedule = () => {
    if (members.length < 4) {
      toast({
        title: "Não foi possível gerar a escala.",
        description: "Não há membros suficientes para gerar uma escala.",
        variant: "destructive",
      });
      return;
    }

    const schedule: Schedule[] = [];
    const memberAssignmentCounts: { [key: string]: number } = {};

    const dates = monthDates.filter(
      (date) => isSaturday(date) || isSunday(date) || isFriday(date),
    );
    dates.forEach((date) => {
      let availableForDate = members.filter(
        (member) =>
          !member.unavailableDates.some((unavailableDate) =>
            isEqual(unavailableDate, date),
          ),
      );

      if (availableForDate.length > 0) {
        const maxMembers =
          availableForDate.length < 4 ? availableForDate.length : 4;
        const scheduleMembers: string[] = [];

        for (let memberIndex = 0; memberIndex < maxMembers; memberIndex++) {
          availableForDate = availableForDate.sort(
            (a, b) =>
              (memberAssignmentCounts[a.name] || 0) -
              (memberAssignmentCounts[b.name] || 0),
          );

          while (true) {
            const index = randomInt(0, availableForDate.length - 1);
            const selectedMember = availableForDate[index];
            if (
              !scheduleMembers.some(
                (alreadyScheduledMember) =>
                  alreadyScheduledMember == selectedMember.name,
              )
            ) {
              memberAssignmentCounts[selectedMember.name] =
                (memberAssignmentCounts[selectedMember.name] || 0) + 1;
              scheduleMembers.push(selectedMember.name);
              break;
            }
          }
        }

        schedule.push({ date, members: scheduleMembers });
      }
    });

    setSchedule(schedule);
    toast({
      title: "Escala gerada",
      description: `Uma nova escala para ${formatLocalized(selectedMonth, "MMMM 'de' yyyy")} foi gerada.`,
    });
  };

  return (
    <div className="flex-grow container mx-auto py-6 px-4 md:px-0 flex flex-col md:flex-row gap-6">
      <Card className="w-full md:w-1/3">
        <CardHeader>
          <CardTitle>Adicionar/atualizar membro</CardTitle>
          <CardDescription>
            Insira os detalhes para um novo membro ou um que já está cadastrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="month-select">Selecionar mês</Label>
              <Select
                value={formatLocalized(selectedMonth, "MMMM 'de' yyyy")}
                onValueChange={(value) =>
                  setConfirmation({
                    isOpen: true,
                    confirmAction: () => handleMonthSelection(value),
                    cancelAction: () => setSelectedMonth(selectedMonth),
                    description: `Ao selecionar um mês diferente do atual, todos os cadastros atuais serão excluídos. Certifique-se que a configuração atual foi exportado antes de continuar.,`,
                  })
                }
              >
                <SelectTrigger id="month-select">
                  <SelectValue placeholder="Selecione um mês" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((date) => (
                    <SelectItem
                      key={formatLocalized(date, "MMMM 'de' yyyy")}
                      value={formatLocalized(date, "MMMM 'de' yyyy")}
                    >
                      {formatLocalized(date, "MMMM 'de' yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Insira um nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Datas de indisponibilidade</Label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentDate ? (
                        formatLocalized(currentDate, "PPP")
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={setCurrentDate}
                      defaultMonth={selectedMonth}
                      fromDate={monthDates[0]}
                      toDate={monthDates[monthDates.length - 1]}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  onClick={handleAddDate}
                  disabled={!currentDate}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="sr-only">Adicionar data</span>
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[100px] w-full rounded-md border p-4">
              <div className="flex flex-wrap gap-2">
                {unavailableDates.map((date) => (
                  <div
                    key={date.getTime()}
                    className="flex items-center bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
                  >
                    {formatLocalized(date, "dd/MM")}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-2 h-4 w-4 p-0"
                      onClick={() => handleRemoveDate(date)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remover data</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button type="submit" className="w-full" disabled={name === ""}>
              Adicionar/atualizar membro
            </Button>
          </form>
          <div className="space-y-2 mt-4">
            <input
              type="file"
              accept=".txt"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              onClick={() =>
                setConfirmation({
                  isOpen: true,
                  confirmAction: () => fileInputRef.current?.click(),
                  cancelAction: () => setSelectedMonth(selectedMonth),
                  description: `Ao importar as configurações de um mês diferente do selecionado, todos os cadastros atuais serão excluídos. Certifique-se que a configuração atual foi exportado antes de continuar.,`,
                })
              }
              variant="outline"
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Carregar arquivo de membros
            </Button>
            <Button
              onClick={handleMembersOnlyExport}
              variant="outline"
              className="w-full"
              disabled={members.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar membros
            </Button>
            <Button
              onClick={handleMembersAndDatesExport}
              variant="outline"
              className="w-full"
              disabled={members.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar membros e datas
            </Button>
          </div>
          <div className="space-y-2 mt-8">
            <Button
              onClick={generateSchedule}
              variant="default"
              className="w-full"
              disabled={members.length < 4}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Gerar escala
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="w-full md:w-2/3">
        <CardHeader>
          <CardTitle>
            Membros e datas de indisponibilidade para{" "}
            {formatLocalized(selectedMonth, "MMMM 'de' yyyy")}
          </CardTitle>
          <CardDescription>
            Visualize todos os membros e suas respectivas datas de
            indisponibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <CardTitle className="text-md">{member.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ScrollArea className="h-[60px]">
                      <div className="flex flex-wrap gap-1">
                        {member.unavailableDates.map((date) => (
                          <span
                            key={date.getTime()}
                            className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs"
                          >
                            {formatLocalized(date, "dd/MM")}
                          </span>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Ainda não há membros para{" "}
              {formatLocalized(selectedMonth, "MMMM 'de' yyyy")}.
            </p>
          )}
        </CardContent>
        <AlertDialog
          open={confirmation.isOpen}
          onOpenChange={(isOpen) =>
            setConfirmation({ ...confirmation, isOpen: isOpen })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cuidado!</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmation.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={confirmation.cancelAction}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmation.confirmAction}>
                Continuar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
      {schedule.length > 0 && (
        <Card className="w-full md:w-2/3">
          <CardHeader>
            <CardTitle>
              Escala gerada para{" "}
              {formatLocalized(selectedMonth, "MMMM 'de' yyyy")}
            </CardTitle>
            <CardDescription>
              Escala para dias de fim de semana para o mês selecionado.
            </CardDescription>
            <Dialog>
              <DialogTrigger>
                <Button
                  variant="default"
                  className="w-full"
                  disabled={members.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar escala
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Escala para{" "}
                    {formatLocalized(selectedMonth, "MMMM 'de' yyyy")}
                  </DialogTitle>
                  <DialogDescription>
                    Exporte a escala para um arquivo de texto ou, se preferir,
                    copie para a área de transferência diretamente.
                  </DialogDescription>
                </DialogHeader>
                <Button
                  onClick={handleScheduleExport}
                  variant="default"
                  className="w-full"
                  disabled={members.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar para arquivo de texto
                </Button>
                <Button
                  onClick={handleScheduleCopy}
                  variant="outline"
                  className="w-full"
                  disabled={members.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Copiar para a àrea de transferência
                </Button>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 gap-4">
              {schedule.map((entry) => (
                <Card
                  key={entry.date.toISOString()}
                  className="overflow-hidden"
                >
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-md">
                      {formatLocalized(entry.date, "EEEE, dd/MM")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div>
                      {entry.members.map((member) => (
                        <p key={member} className="text-sm">
                          {member}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
