import { GoogleGenAI, Type } from "@google/genai";
import { TimetableExtractionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uploads a base64 string (image/pdf/text) of a timetable/attendance report and extracts subjects.
 * @param base64Content - The data URL or base64 content
 * @param mimeType - The MIME type of the content (e.g. image/png, application/pdf, text/html)
 */
export const extractSubjectsFromTimetable = async (base64Content: string, mimeType: string = 'image/jpeg'): Promise<TimetableExtractionResult> => {
  try {
    const modelId = "gemini-2.5-flash"; 

    // Clean up base64 if it has the data header
    const cleanBase64 = base64Content.split(',')[1] || base64Content;
    
    let parts: any[] = [];

    if (mimeType.startsWith('text/')) {
       const decodedText = atob(cleanBase64);
       parts.push({
         text: `Here is the document data:\n${decodedText}`
       });
    } else {
       parts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      });
    }

    parts.push({
      text: `Analyze this input. It is likely a student's class timetable or attendance report.
      
      Tasks:
      1. Identify all distinct Subjects.
      2. EXTRACT SCHEDULE: For each subject, find all its time slots in the grid.
         - Map Row/Column headers to find Day and Time.
         - A subject usually appears multiple times (e.g. Mon 10-11, Wed 2-3). Capture ALL occurrences.
         - Format Day as full English Name: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday".
         - Format Time as "HH:MM AM/PM - HH:MM AM/PM" (e.g. "10:00 AM - 11:00 AM"). If end time is missing, infer it or use start time "HH:MM AM/PM".
      3. EXTRACT ATTENDANCE: If "Total Lectures Held" and "Lectures Attended" counts are visible (usually in attendance reports), extract them.
      
      Constraints:
      - Ignore "Lunch", "Break", "Recess", "Free Period".
      - If a cell contains "Maths (Room 101)", the subject is "Maths".
      - Return the result in JSON format.`
    });

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjects: {
              type: Type.ARRAY,
              items: { 
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the subject" },
                  total: { type: Type.NUMBER, description: "Total lectures held (if found), else 0" },
                  attended: { type: Type.NUMBER, description: "Total lectures attended (if found), else 0" },
                  schedule: {
                    type: Type.ARRAY,
                    description: "List of class timings found for this subject",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.STRING, description: "Day of the week e.g. Monday" },
                        time: { type: Type.STRING, description: "Time of the class e.g. 10:00 AM - 11:00 AM" }
                      }
                    }
                  }
                }
              },
              description: "List of subjects found with optional attendance and schedule data"
            },
            scheduleSummary: {
              type: Type.STRING,
              description: "A brief text summary of the schedule pattern if discernible"
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No data returned from Gemini");
    }

    const result = JSON.parse(jsonText) as TimetableExtractionResult;
    return result;

  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    
    let errorMessage = "Failed to process file. Please try again or use manual entry.";

    // Improved Error Handling based on common Gemini/Network codes
    if (error.message) {
      if (error.message.includes("400") || error.message.includes("INVALID_ARGUMENT")) {
        errorMessage = "The AI couldn't read this file format. Please ensure it's a clear Image (PNG/JPG) or PDF.";
      } else if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        errorMessage = "System is busy (Rate Limit). Please wait a moment and try again.";
      } else if (error.message.includes("401") || error.message.includes("PERMISSION_DENIED")) {
        errorMessage = "Access denied. Please check your API configuration.";
      } else if (error.message.includes("500") || error.message.includes("INTERNAL")) {
        errorMessage = "AI Service temporarily unavailable. Please try again later.";
      } else if (error.message.includes("safety") || error.message.includes("blocked")) {
        errorMessage = "The file content was flagged by safety filters. Please try a different file.";
      } else if (error.message.includes("candidate")) {
         errorMessage = "The AI couldn't find structured timetable data in this file. Try a clearer image.";
      }
    }

    throw new Error(errorMessage);
  }
};