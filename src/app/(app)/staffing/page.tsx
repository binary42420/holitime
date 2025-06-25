"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, UserCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { staffingSuggestions, type StaffingSuggestionsOutput } from "@/ai/flows/staffing-suggestions"
import { useToast } from "@/hooks/use-toast"
import { mockEmployees } from "@/lib/mock-data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const formSchema = z.object({
  jobRequirements: z.string().min(10, "Please provide detailed job requirements."),
  numSuggestions: z.coerce.number().min(1).max(10),
})

export default function StaffingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<StaffingSuggestionsOutput | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobRequirements: "Need 2 certified forklift operators for a warehouse loading shift. Must have at least 1 year of experience and be available for an 8-hour shift starting at 8 AM. Location is Downtown warehouse.",
      numSuggestions: 3,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setSuggestions(null)
    try {
      // Create a summary of mock employee data for the AI
      const employeeData = {
          availability: "All employees are generally available unless specified otherwise.",
          certifications: mockEmployees.map(e => `${e.name}: ${e.certifications.join(', ')}`).join('; '),
          pastPerformance: mockEmployees.map(e => `${e.name}: ${e.performance}/5 rating`).join('; '),
          locations: mockEmployees.map(e => `${e.name} is in ${e.location}`).join('; '),
      }

      const result = await staffingSuggestions({
        ...values,
        employeeAvailability: employeeData.availability,
        employeeCertifications: employeeData.certifications,
        employeePastPerformance: employeeData.pastPerformance,
        employeeLocations: employeeData.locations,
      })
      setSuggestions(result)
    } catch (error) {
      console.error("Error fetching staffing suggestions:", error)
      toast({
        title: "Error",
        description: "Failed to fetch staffing suggestions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Smart Staffing Suggestions</CardTitle>
          <CardDescription>
            Use AI to find the best-qualified personnel for your open shifts.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-requirements">Job Requirements</Label>
              <Textarea
                id="job-requirements"
                placeholder="Describe the skills, certifications, and experience needed..."
                className="min-h-[120px]"
                {...form.register("jobRequirements")}
              />
              {form.formState.errors.jobRequirements && <p className="text-sm text-destructive">{form.formState.errors.jobRequirements.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="num-suggestions">Number of Suggestions</Label>
              <Input
                id="num-suggestions"
                type="number"
                min="1"
                max="10"
                {...form.register("numSuggestions")}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get Suggestions
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="space-y-6">
        {isLoading && (
          <Card className="flex flex-col items-center justify-center h-96">
            <CardContent className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Finding the best candidates...</p>
            </CardContent>
          </Card>
        )}
        {suggestions && (
           <Card>
            <CardHeader>
              <CardTitle>Top Recommendations</CardTitle>
              <CardDescription>Here are the best matches for your shift.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestions.suggestions.map((suggestion) => (
                <div key={suggestion.employeeId} className="p-4 border rounded-lg bg-background/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://i.pravatar.cc/40?u=${suggestion.employeeId}`} alt={suggestion.name} data-ai-hint="person" />
                          <AvatarFallback>{suggestion.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      <div>
                        <p className="font-bold">{suggestion.name}</p>
                         <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Match Score</Label>
                          <Progress value={suggestion.matchScore * 10} className="w-24 h-2" />
                        </div>
                      </div>
                    </div>
                     <Button size="sm" variant="outline"><UserCheck className="mr-2 h-4 w-4" /> Assign</Button>
                  </div>
                   <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">{suggestion.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
