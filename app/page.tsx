"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { CalendarIcon, PlusCircle, X, Upload, Download } from "lucide-react";
import {
  isEqual,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  isSaturday,
  isSunday,
  isFriday,
  isSameMonth,
} from "date-fns";
import {
  cn,
  formatLocalized,
  randomInt,
  handleTextFileExport,
  parseLocalized,
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
  name: string;
  unavailableDates: Date[];
};

type ScheduleEntry = {
  date: Date;
  members: string[];
};

class Confirmation {
  private _confirmAction: () => void = () => {};
  private _cancelAction: () => void = () => {};

  readonly isOpen: boolean;
  readonly description: string;

  constructor(confirmation: Partial<Confirmation>) {
    this.isOpen = confirmation.isOpen ?? false;
    this.description = confirmation.description ?? "";
    this._confirmAction = confirmation.confirmAction ?? (() => {});
    this._cancelAction = confirmation.cancelAction ?? (() => {});
  }

  get confirmAction(): () => void {
    const oldConfirmAction = this._confirmAction;
    this._confirmAction = () => {};
    return oldConfirmAction;
  }

  get cancelAction(): () => void {
    const oldCancelAction = this._cancelAction;
    this._cancelAction = () => {};
    return oldCancelAction;
  }
}

class State {
  readonly members: Member[];
  readonly name: string;
  readonly unavailableDates: Date[];
  readonly selectedMonth: Date;
  readonly selectedDate: Date | undefined;
  readonly schedule: ScheduleEntry[];
  readonly confirmation: Confirmation;

  constructor(newState: Partial<State>, oldState?: State) {
    this.members = newState.members ?? oldState?.members ?? [];
    this.name = newState.name ?? oldState?.name ?? "";
    this.unavailableDates =
      newState.unavailableDates ?? oldState?.unavailableDates ?? [];
    this.selectedDate =
      newState.selectedDate ?? oldState?.selectedDate ?? undefined;
    this.selectedMonth =
      newState.selectedMonth ?? oldState?.selectedMonth ?? new Date();
    this.schedule = newState.schedule ?? oldState?.schedule ?? [];
    this.confirmation =
      newState.confirmation ?? oldState?.confirmation ?? new Confirmation({});
  }

  get monthDates(): Date[] {
    if (!this.selectedMonth) return [];

    const start = startOfMonth(this.selectedMonth);
    const end = endOfMonth(this.selectedMonth);
    return eachDayOfInterval({ start, end });
  }
}

export default function Page() {
  const availableMonths: Date[] = Array.from({ length: 12 }, (_, i: number) =>
    addMonths(new Date(), i),
  );

  let currentSelectedMonth: Date = availableMonths[0];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [state, setState] = useState<State>(
    new State({
      name: "",
      members: [],
      unavailableDates: [],
      selectedMonth: availableMonths[0],
      schedule: [],
      confirmation: new Confirmation({}),
    }),
  );

  const updateState = (partialState: Partial<State>) => {
    setState((currentState) => new State(partialState, currentState));
  };

  const handleMonthSelection = (month: Date) => {
    if (isSameMonth(state.selectedMonth, month)) return;
    currentSelectedMonth = month;
    updateState({
      selectedMonth: month,
      name: "",
      members: [],
      unavailableDates: [],
      schedule: [],
    });
  };

  const handleAddDate = () => {
    if (
      state.selectedDate &&
      !state.unavailableDates.some((date) => isEqual(date, state.selectedDate!))
    ) {
      updateState({
        unavailableDates: [...state.unavailableDates, state.selectedDate],
        selectedDate: undefined,
      });
    }
  };

  const handleRemoveDate = (dateToRemove: Date) => {
    updateState({
      unavailableDates: state.unavailableDates.filter(
        (date) => !isEqual(date, dateToRemove),
      ),
    });
  };

  const updateMembers = (members: Member[]) => {
    let currentMembers: Member[] = state.members;

    members.forEach((member) => {
      const existingMemberIndex = currentMembers.findIndex(
        (existingMember) =>
          existingMember.name.toLowerCase() === member.name.toLowerCase(),
      );
      if (existingMemberIndex !== -1) {
        const existingMember = currentMembers[existingMemberIndex];
        const updatedDates = [
          ...existingMember.unavailableDates,
          ...member.unavailableDates.filter(
            (newDate) =>
              !existingMember.unavailableDates.some((existingDate) =>
                isEqual(existingDate, newDate),
              ),
          ),
        ];
        currentMembers = [
          ...currentMembers.slice(0, existingMemberIndex),
          { ...existingMember, unavailableDates: updatedDates },
          ...currentMembers.slice(existingMemberIndex + 1),
        ];
      } else {
        currentMembers = [...currentMembers, member];
      }
    });

    updateState({ members: currentMembers });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentName = state.name;

    if (state.name) {
      updateMembers([
        { name: currentName, unavailableDates: state.unavailableDates },
      ]);
      updateState({ name: "", unavailableDates: [] });
    }

    toast({
      title: "Membro atualizado",
      description: `As datas de indisponibilidade do membro ${currentName} foram atualizadas para ${formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")}.`,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result as string;
        const lines = content.split("\n");
        const membersToBeAdded: Member[] = [];
        let newMonth: Date | undefined = undefined;

        lines.forEach((line) => {
          const [name, ...dateParts] = line.split(",");
          const dates = dateParts
            .map((datePart) => parseLocalized(datePart.trim(), "dd/MM/yyyy"))
            .filter((date) => !isNaN(date.getTime()));

          const firstDate: Date | undefined = dates[0];
          if (firstDate && !newMonth) {
            newMonth = firstDate;
          }

          if (name) {
            membersToBeAdded.push({
              name: name.trim(),
              unavailableDates: dates ?? [],
            });
          }
        });

        if (newMonth) handleMonthSelection(newMonth);

        const start = startOfMonth(newMonth ?? state.selectedMonth);
        const end = endOfMonth(newMonth ?? state.selectedMonth);
        const monthDates = eachDayOfInterval({ start, end });

        const updatedMembersToBeAdded: Member[] = membersToBeAdded.map(
          (member) => {
            const filteredDatesForMember = member.unavailableDates.filter(
              (date) => {
                return monthDates.some((monthDate) => isEqual(monthDate, date));
              },
            );

            return {
              name: member.name,
              unavailableDates: filteredDatesForMember,
            };
          },
        );

        updateMembers(updatedMembersToBeAdded);

        toast({
          title: "Arquivo processado",
          description: `Membros e suas respectivas datas de indisponbilidade foram atualizados para ${formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")}.`,
        });
      };

      reader.readAsText(file);
    }
  };

  const handleMembersAndDatesExport = () => {
    const content = state.members
      .map((member) => {
        const formattedDates = member.unavailableDates
          .map((date) => formatLocalized(date, "dd/MM/yyyy"))
          .join(", ");
        return `${member.name}, ${formattedDates}`;
      })
      .join("\n");

    handleTextFileExport(
      content,
      `membros_${formatLocalized(state.selectedMonth, "yyyy-MM")}`,
      "Arquivo exportado",
      `${state.members.length} membros e suas respectivas datas de indispobilidade para ${formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")} foram exportados.`,
    );
  };

  const handleMembersOnlyExport = () => {
    const content = state.members.map((member) => member.name).join("\n");

    handleTextFileExport(
      content,
      "membros",
      "Arquivo exportado",
      `${state.members.length} foram exportados.`,
    );
  };

  const generateScheduleOutput = (): string => {
    return state.schedule
      .map(
        (schedule) =>
          `*${formatLocalized(schedule.date, "EEEE, dd MMM")}*\n` +
          schedule.members.map((member) => member).join("\n"),
      )
      .join("\n\n");
  };

  const handleScheduleExport = () => {
    const formattedDate = formatLocalized(state.schedule[0].date, "yyyy-MM");

    handleTextFileExport(
      generateScheduleOutput(),
      `escala_${formattedDate}`,
      "Arquivo exportado",
      `Escala para ${formattedDate} foi exportada.`,
    );
  };

  const handleScheduleCopy = () => {
    const formattedDate = formatLocalized(state.schedule[0].date, "yyyy-MM");

    navigator.clipboard.writeText(generateScheduleOutput());

    toast({
      title: "Escala copiada",
      description: `Escala para ${formattedDate} foi copiada para a área de transferência.`,
    });
  };

  const generateSchedule = () => {
    if (state.members.length < 4) {
      toast({
        title: "Não foi possível gerar a escala.",
        description: "Não há membros suficientes para gerar uma escala.",
        variant: "destructive",
      });
      return;
    }

    const schedule: ScheduleEntry[] = [];
    const memberAssignmentCounts: { [key: string]: number } = {};

    const dates = state.monthDates.filter(
      (date) => isSaturday(date) || isSunday(date) || isFriday(date),
    );
    dates.forEach((date) => {
      let availableForDate = state.members.filter(
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

    updateState({ schedule: schedule });
    toast({
      title: "Escala gerada",
      description: `Uma nova escala para ${formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")} foi gerada.`,
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
                defaultValue={formatLocalized(
                  state.selectedMonth,
                  "MMMM 'de' yyyy",
                )}
                onValueChange={(value) =>
                  updateState({
                    confirmation: new Confirmation({
                      isOpen: true,
                      confirmAction: () => {
                        handleMonthSelection(
                          parseLocalized(value, "MMMM 'de' yyyy"),
                        );
                      },
                      description: `Ao selecionar um mês diferente do atual, todos os cadastros atuais serão excluídos. Certifique-se que a configuração atual foi exportado antes de continuar.,`,
                    }),
                  })
                }
              >
                <SelectTrigger id="month-select">
                  <SelectValue placeholder="Selecione um mês">
                    {formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")}
                  </SelectValue>
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
                value={state.name}
                onChange={(e) => updateState({ name: e.target.value })}
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
                        !state.selectedDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {state.selectedDate ? (
                        formatLocalized(state.selectedDate, "PPP")
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={state.selectedDate}
                      onSelect={(value) => updateState({ selectedDate: value })}
                      defaultMonth={state.selectedMonth}
                      fromDate={state.monthDates[0]}
                      toDate={state.monthDates[state.monthDates.length - 1]}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  onClick={handleAddDate}
                  disabled={!state.selectedDate}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="sr-only">Adicionar data</span>
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[100px] w-full rounded-md border p-4">
              <div className="flex flex-wrap gap-2">
                {state.unavailableDates.map((date) => (
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
            <Button
              type="submit"
              className="w-full"
              disabled={state.name === ""}
            >
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
                updateState({
                  confirmation: new Confirmation({
                    isOpen: true,
                    confirmAction: () => fileInputRef.current?.click(),
                    description: `Ao importar as configurações de um mês diferente do selecionado, todos os cadastros atuais serão excluídos. Certifique-se que a configuração atual foi exportado antes de continuar.,`,
                  }),
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
              disabled={state.members.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar membros
            </Button>
            <Button
              onClick={handleMembersAndDatesExport}
              variant="outline"
              className="w-full"
              disabled={state.members.length === 0}
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
              disabled={state.members.length < 4}
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
            {formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")}
          </CardTitle>
          <CardDescription>
            Visualize todos os membros e suas respectivas datas de
            indisponibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.members.map((member) => (
                <Card key={member.name} className="overflow-hidden">
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
              {formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")}.
            </p>
          )}
        </CardContent>
        <AlertDialog
          open={state.confirmation.isOpen}
          onOpenChange={(isOpen) =>
            updateState({
              confirmation: new Confirmation({
                ...state.confirmation,
                isOpen: isOpen,
              }),
            })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cuidado!</AlertDialogTitle>
              <AlertDialogDescription>
                {state.confirmation.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => state.confirmation.cancelAction()}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => state.confirmation.confirmAction()}
              >
                Continuar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
      {state.schedule.length > 0 && (
        <Card className="w-full md:w-2/3">
          <CardHeader>
            <CardTitle>
              Escala gerada para{" "}
              {formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")}
            </CardTitle>
            <CardDescription>
              Escala para dias de fim de semana para o mês selecionado.
            </CardDescription>
            <Dialog>
              <DialogTrigger>
                <Button
                  variant="default"
                  className="w-full"
                  disabled={state.members.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar escala
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Escala para{" "}
                    {formatLocalized(state.selectedMonth, "MMMM 'de' yyyy")}
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
                  disabled={state.members.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar para arquivo de texto
                </Button>
                <Button
                  onClick={handleScheduleCopy}
                  variant="outline"
                  className="w-full"
                  disabled={state.members.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Copiar para a àrea de transferência
                </Button>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 gap-4">
              {state.schedule.map((entry) => (
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
