import React, { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const triggerClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white shadow-none h-auto hover:bg-white/5 focus:ring-amber-400/40";

export default function SelectField({ value, onValueChange, options, placeholder, className, disabled }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder || "Select…";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex items-center justify-between disabled:cursor-not-allowed disabled:opacity-50",
              triggerClass,
              className
            )}
          >
            <span className={cn(!value && "text-zinc-500")}>{selectedLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        </DrawerTrigger>
        <DrawerContent className="border-white/10 bg-zinc-900 text-white">
          <DrawerHeader>
            <DrawerTitle>{placeholder || "Select an option"}</DrawerTitle>
            <DrawerDescription className="sr-only">Choose an option</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-y-auto px-2 pb-6">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onValueChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition-colors",
                  o.value === value ? "bg-amber-400/10 text-amber-300" : "text-white hover:bg-white/5"
                )}
              >
                {o.label}
                {o.value === value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn(triggerClass, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72 border-white/10 bg-zinc-900 text-white">
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="text-white focus:bg-amber-400/10 focus:text-amber-300 data-[highlighted]:bg-amber-400/10 data-[highlighted]:text-amber-300"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}