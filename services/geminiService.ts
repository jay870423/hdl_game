
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
      contents: `Generate a funny, high-stakes 80s action game briefing for Level ${level}. 
      THEME: "Operation Capy-Venom". 
      The world has been invaded by alien "Symbiotes" (like Venom/Carnage) that have infected the local wildlife: mainly CAPYBARAS.
      The enemies are chill but deadly infected Capybaras holding guns.
      The Bosses are giant, liquid, shapeshifting Symbiote monsters.
      
      Levels: 
      1=Jungle (Infected Capys), 
      2=Outpost, 
      3=Slime Falls, 
      4=Frozen Hive, 
      5=Infected Lair, 
      6=Venom Core, 
      7=Sky Web, 
      8=Klyntar Void (The Symbiote Planet).

      Make Level 8 sound like a cosmic horror nightmare.
      Keep it short (max 2 sentences for briefing).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "The name of the mission. E.g., 'THE CHILL INVASION'.",
            },
            briefing: {
              type: Type.STRING,
              description: "A short, intense, but slightly funny briefing text.",
            },
            bossName: {
              type: Type.STRING,
              description: "A cool name for the Symbiote Boss. E.g., 'SLUDGE-BARA', 'RIOT-CLAW', 'THE CARNAGE HOST'.",
            }
          },
          required: ["title", "briefing", "bossName"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text returned");
    return JSON.parse(text) as MissionData;

  } catch (error) {
    console.error("AI Gen Failed, using fallback", error);
    return getFallbackMission(level);
  }
};

const getFallbackMission = (level: number): MissionData => {
  const missions = [
    { title: "CAPY JUNGLE", briefing: "Capybaras have been infected by black goo! They are armed and... surprisingly chill.", bossName: "VENOM-BARA" },
    { title: "SYMBIOTE BASE", briefing: "Breaching the enemy outpost. Watch out for sticky traps.", bossName: "TOXIN-MK1" },
    { title: "SLIME FALLS", briefing: "Don't touch the green water. It's not Gatorade.", bossName: "SLUDGE BEAST" },
    { title: "FROZEN HIVE", briefing: "The symbiotes adapted to the cold. Stay frosty.", bossName: "ICE-SCREAM" },
    { title: "INFECTED LAIR", briefing: "Deep underground. The walls are moving.", bossName: "LASHER" },
    { title: "VENOM CORE", briefing: "The heart of the infection. It beats like a drum.", bossName: "RIOT" },
    { title: "SKY WEB", briefing: "Fighting in the clouds on webs of black goo.", bossName: "PHAGE" },
    { title: "KLYNTAR VOID", briefing: "The source of all evil. Eliminate the Hive Mind.", bossName: "KNULL'S AVATAR" },
  ];
  return missions[(level - 1) % missions.length];
};
