'use server';
/**
 * @fileOverview An AI agent for adjusting timesheet entries based on company rules.
 *
 * - adjustTimesheet - A function that applies rounding and synchronization rules to shift time entries.
 * - AdjustTimesheetInput - The input type for the adjustTimesheet function.
 * - AdjustTimesheetOutput - The return type for the adjustTimesheet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TimeEntrySchema = z.object({
  clockIn: z.string().optional(),
  clockOut: z.string().optional(),
});

const EmployeeSchema = z.object({
    id: z.string(),
    name: z.string(),
    certifications: z.array(z.string()),
    performance: z.number(),
    location: z.string(),
    avatar: z.string(),
});

const AssignedPersonnelSchema = z.object({
  employee: EmployeeSchema,
  roleOnShift: z.string(),
  status: z.string(), // Kept as string for simplicity for the AI model
  timeEntries: z.array(TimeEntrySchema),
});

const AdjustTimesheetInputSchema = z.object({
  personnel: z.array(AssignedPersonnelSchema).describe('The list of assigned personnel with their current time entries.'),
});
export type AdjustTimesheetInput = z.infer<typeof AdjustTimesheetInputSchema>;

const AdjustTimesheetOutputSchema = z.object({
  adjustedPersonnel: z.array(AssignedPersonnelSchema).describe('The list of assigned personnel with their adjusted time entries.'),
  adjustmentsSummary: z.string().describe('A brief summary of the changes made.')
});
export type AdjustTimesheetOutput = z.infer<typeof AdjustTimesheetOutputSchema>;

export async function adjustTimesheet(input: AdjustTimesheetInput): Promise<AdjustTimesheetOutput> {
  return adjustTimesheetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustTimesheetPrompt',
  input: {schema: AdjustTimesheetInputSchema},
  output: {schema: AdjustTimesheetOutputSchema},
  prompt: `You are an intelligent timesheet auditing assistant for a workforce management company named "Hands On Labor".
Your task is to analyze and adjust the clock-in and clock-out times for a shift's personnel based on the company's policies.

Here are the policies you must enforce:
1.  **Rounding Rule:**
    *   All **clock-in** times must be rounded **down** to the nearest 15-minute increment (e.g., 08:07 becomes 08:00, 08:29 becomes 08:15).
    *   All **clock-out** times must be rounded **up** to the nearest 15-minute increment (e.g., 16:52 becomes 17:00, 16:31 becomes 16:45).

2.  **Synchronization Rule (Grace Period):**
    *   For each time entry set (e.g., the first clock-in for all employees, the first clock-out, etc.), find the most common time after rounding. This is the "majority time".
    *   If a minority of employees have a rounded time that is within 15 minutes of the "majority time", adjust their time to match the majority. This is a grace period adjustment.
    *   Example: If most employees' first clock-in is rounded to 08:00, and one employee's is rounded to 08:15, change that one employee's time to 08:00.
    *   Apply this synchronization logic to each set of clock-ins and clock-outs independently.

You will be given a list of assigned personnel and their recorded time entries.
Process all time entries according to the rules above.
Return the full list of personnel with their adjusted times, along with a summary of the changes you made.

Personnel Data:
{{{json personnel}}}
`,
});

const adjustTimesheetFlow = ai.defineFlow(
  {
    name: 'adjustTimesheetFlow',
    inputSchema: AdjustTimesheetInputSchema,
    outputSchema: AdjustTimesheetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
