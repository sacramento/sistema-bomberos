'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AddFirefighterDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Logic to add firefighter would go here
    toast({
        title: "Success!",
        description: "New firefighter has been added to the roster.",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Add New Firefighter</DialogTitle>
            <DialogDescription>
              Enter the details for the new firefighter. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="id" className="text-right">
                ID Number
              </Label>
              <Input id="id" defaultValue={`FG-00${Math.floor(Math.random()*100)}`} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" placeholder="e.g. John Doe" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rank" className="text-right">
                Rank
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a rank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firefighter">Firefighter</SelectItem>
                  <SelectItem value="lieutenant">Lieutenant</SelectItem>
                  <SelectItem value="captain">Captain</SelectItem>
                  <SelectItem value="battalion-chief">Battalion Chief</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firehouse" className="text-right">
                Firehouse
              </Label>
              <Input id="firehouse" placeholder="e.g. Station 1" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save Firefighter</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
