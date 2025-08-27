import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { firefighters, sessions } from "@/lib/data";
import { Download, Filter } from "lucide-react";

export default function AttendancePage({ params }: { params: { id: string } }) {
    const session = sessions.find(s => s.id === params.id);

    if (!session) {
        return (
          <>
            <PageHeader title="Session Not Found" />
            <p>The requested session could not be found.</p>
          </>
        )
    }

    return (
        <>
            <PageHeader title={`Attendance: ${session.title}`} description={`Track attendance for the session on ${session.date}.`}>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Attendees</CardTitle>
                            <CardDescription>Mark the status for each firefighter assigned to this session.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Firehouse</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {session.attendees.map(firefighter => (
                                        <TableRow key={firefighter.id}>
                                            <TableCell className="font-medium">{firefighter.name}</TableCell>
                                            <TableCell>{firefighter.rank}</TableCell>
                                            <TableCell>{firefighter.firehouse}</TableCell>
                                            <TableCell>
                                                <RadioGroup defaultValue="present" className="flex justify-end gap-4">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="present" id={`r1-${firefighter.id}`} />
                                                        <Label htmlFor={`r1-${firefighter.id}`}>Present</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="absent" id={`r2-${firefighter.id}`} />
                                                        <Label htmlFor={`r2-${firefighter.id}`}>Absent</Label>
                                                    </div>
                                                     <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="tardy" id={`r3-${firefighter.id}`} />
                                                        <Label htmlFor={`r3-${firefighter.id}`}>Tardy</Label>
                                                    </div>
                                                     <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="excused" id={`r4-${firefighter.id}`} />
                                                        <Label htmlFor={`r4-${firefighter.id}`}>Excused</Label>
                                                    </div>
                                                </RadioGroup>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                               <Filter className="h-5 w-5"/> Filters & Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                               <Label>Firehouse</Label>
                               <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Firehouses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="s1">Station 1</SelectItem>
                                    <SelectItem value="s2">Station 2</SelectItem>
                                    <SelectItem value="s3">Station 3</SelectItem>
                                </SelectContent>
                               </Select>
                            </div>
                             <div className="space-y-2">
                               <Label>Rank</Label>
                               <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Ranks" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="firefighter">Firefighter</SelectItem>
                                  <SelectItem value="lieutenant">Lieutenant</SelectItem>
                                  <SelectItem value="captain">Captain</SelectItem>
                                  <SelectItem value="battalion-chief">Battalion Chief</SelectItem>
                                </SelectContent>
                               </Select>
                            </div>
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-medium">Summary</h4>
                                <div className="flex justify-between items-center text-sm"><span>Present:</span> <span className="font-bold">28</span></div>
                                <div className="flex justify-between items-center text-sm"><span>Absent:</span> <span className="font-bold">2</span></div>
                                <div className="flex justify-between items-center text-sm"><span>Tardy:</span> <span className="font-bold">1</span></div>
                                <div className="flex justify-between items-center text-sm"><span>Excused:</span> <span className="font-bold">0</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
