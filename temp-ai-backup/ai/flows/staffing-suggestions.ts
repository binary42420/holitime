// Staffing suggestions
'use server';

/**
 * @fileOverview AI-powered staffing suggestion agent.
 *
 * - staffingSuggestions - A function that provides staffing suggestions for open shifts.
 * - StaffingSuggestionsInput - The input type for the staffingSuggestions function.
 * - StaffingSuggestionsOutput - The return type for the staffingSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StaffingSuggestionsInputSchema = z.object({
  jobRequirements: z.string().describe('Detailed requirements for the job/shift, including skills, certifications, and experience.'),
  employeeAvailability: z.string().describe('Information about employee availability, including scheduled time off and preferred hours.'),
  employeeCertifications: z.string().describe('A list of employee certifications.'),
  employeePastPerformance: z.string().describe('Data on employee past performance, including ratings and feedback.'),
  employeeLocations: z.string().describe('Employee locations'),
  numSuggestions: z.number().describe('Number of staffing suggestions to provide.'),
});
export type StaffingSuggestionsInput = z.infer<typeof StaffingSuggestionsInputSchema>;

const StaffingSuggestionsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      employeeId: z.string().describe('The ID of the suggested employee.'),
      name: z.string().describe('The name of the suggested employee.'),
      matchScore: z.number().describe('A score indicating how well the employee matches the job requirements.'),
      reason: z.string().describe('Reasoning for the suggestion and conflict detection.'),
    })
  ).describe('A list of staffing suggestions, including employee ID, name, match score, and reasoning.'),
});
export type StaffingSuggestionsOutput = z.infer<typeof StaffingSuggestionsOutputSchema>;

export async function staffingSuggestions(input: StaffingSuggestionsInput): Promise<StaffingSuggestionsOutput> {
  return staffingSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'staffingSuggestionsPrompt',
  input: {schema: StaffingSuggestionsInputSchema},
  output: {schema: StaffingSuggestionsOutputSchema},
  prompt: `You are an AI assistant designed to provide smart staffing suggestions for open shifts.

  Analyze the provided job requirements, employee availability, certifications, past performance, and location to identify the most qualified employees.

  Job Requirements: {{{jobRequirements}}}
  Employee Availability: {{{employeeAvailability}}}
  Employee Certifications: {{{employeeCertifications}}}
  Employee Past Performance: {{{employeePastPerformance}}}
  Employee Locations: {{{employeeLocations}}}

  Consider all factors to determine the best candidates, provide a match score for each suggestion, and include reasoning for the suggestion and conflict detection.

  Provide {{{numSuggestions}}} staffing suggestions.
  Format your response as a JSON object conforming to the following schema: {{json schema=StaffingSuggestionsOutputSchema}}`,
});

const staffingSuggestionsFlow = ai.defineFlow(
  {
    name: 'staffingSuggestionsFlow',
    inputSchema: StaffingSuggestionsInputSchema,
    outputSchema: StaffingSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
