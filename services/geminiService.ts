
declare var process: {
  env: {
    API_KEY: string;
  };
};

import { GoogleGenAI, Type } from "@google/genai";
import { MissionData } from '../types';

export const generateMissionData = async (level: number): Promise<MissionData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return getFallbackMission(level);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a cool, 80s action movie style mission briefing for Level ${level} of a Contra-like run and gun game. 
      Levels: 1=Jungle, 2=Base, 3=Waterfall, 4=Snow, 5=Alien Lair, 6=Volcano, 7=Sky Fortress, 8=Neural Void (Final Dimension).
      Keep it short and punchy. Make Level 8 sound impossible.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "The name of the mission.",
            },
            briefing: {
              type: Type.STRING,
              description: "Two sentences describing the threat.",
            },
            bossName: {
              type: Type.STRING,
              description: "The name of the final boss.",
            }
          },
          required: ["title", "briefing", "bossName"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text response");
    
    const data = JSON.parse(text) as MissionData;
    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return getFallbackMission(level);
  }
};

const getFallbackMission = (level: number): MissionData => {
  const missions = [
    { title: "Jungle Raid", briefing: "Infiltrate the coast. Secure the landing zone.", bossName: "Wall Fortress" },
    { title: "Base Infiltration", briefing: "Breach the enemy compound. Destroy their supplies.", bossName: "Cyber Tank" },
    { title: "Waterfall Climb", briefing: "Scale the falls. The enemy is heavily dug in.", bossName: "Heavy Chopper" },
    { title: "Frozen Tundra", briefing: "Survive the cold. Locate the secret lab entrance.", bossName: "Ice Mecha" },
    { title: "Alien Hive", briefing: "Destroy the Queen. Save the world.", bossName: "Emperor Heart" },
    { title: "Magma Core", briefing: "The base is self-destructing. Escape the volcano.", bossName: "Magma Golem" },
    { title: "Sky Fortress", briefing: "Board the airship. Don't look down.", bossName: "Sky Captain" },
    { title: "Neural Void", briefing: "Enter the digital chaos. End this nightmare.", bossName: "Omega Brain" },
  ];
  return missions[level - 1] || missions[0];
};
