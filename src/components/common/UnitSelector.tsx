import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UnitOption {
  id: string;
  nome_interno: string;
  property_name?: string;
}

interface UnitSelectorProps {
  value: string;
  onChange: (value: string) => void;
  units?: UnitOption[];
}

export function UnitSelector({ value, onChange, units = [] }: UnitSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-12 bg-card border-border">
        <SelectValue placeholder="Seleziona unità" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="font-medium">Tutti gli immobili</span>
        </SelectItem>
        {units.map((unit) => (
          <SelectItem key={unit.id} value={unit.id}>
            <div className="flex flex-col">
              <span>{unit.nome_interno}</span>
              {unit.property_name && (
                <span className="text-xs text-muted-foreground">{unit.property_name}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
