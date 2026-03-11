import { useState, useRef, useCallback } from 'react';
import { getGenAI } from '@/lib/genai';
import { MAX_IMAGES_PER_LOCATION, MODELS, IMAGE_GEN } from '@/lib/constants';

export function useImageGeneration() {
  const [sceneImages, setSceneImages] = useState<string[]>([]);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [currentSceneDesc, setCurrentSceneDesc] = useState('');
  const sceneImageCountRef = useRef(0);

  const resetImages = useCallback(() => {
    sceneImageCountRef.current = 0;
    setSceneImages([]);
  }, []);

  const generateSceneImage = useCallback(async (description: string, tone: string) => {
    if (sceneImageCountRef.current >= MAX_IMAGES_PER_LOCATION) return;
    sceneImageCountRef.current += 1;

    setIsGeneratingScene(true);
    setCurrentSceneDesc(description);

    const attempt = async (retryCount = 0): Promise<void> => {
      try {
        const ai = getGenAI();
        const prompt = `A highly detailed, cinematic fantasy illustration. ${description}. Tone: ${tone}. Masterpiece, trending on artstation, 8k.`;
        const response = await ai.models.generateContent({
          model: MODELS.IMAGE_GEN,
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: IMAGE_GEN.ASPECT_RATIO, imageSize: IMAGE_GEN.IMAGE_SIZE } },
        });

        let found = false;
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData) {
            setSceneImages(prev => [...prev, `data:image/png;base64,${part.inlineData!.data}`]);
            found = true;
            break;
          }
        }
        // Release the slot if no image was returned so a retry can fill it.
        if (!found) sceneImageCountRef.current -= 1;
      } catch (error: unknown) {
        const status =
          (error as { status?: number })?.status ??
          (error as { error?: { code?: number } })?.error?.code;

        if (status === 429 && retryCount < IMAGE_GEN.RETRY_LIMIT) {
          const match = JSON.stringify(error).match(/"retryDelay"\s*:\s*"(\d+)s"/);
          const delayMs = match?.[1] ? parseInt(match[1]) * 1000 : IMAGE_GEN.DEFAULT_RETRY_DELAY_MS;
          await new Promise(res => setTimeout(res, delayMs));
          return attempt(retryCount + 1);
        }

        console.error('Failed to generate scene image:', error);
        sceneImageCountRef.current -= 1;
      }
    };

    try {
      await attempt();
    } finally {
      setIsGeneratingScene(false);
    }
  }, []);

  return { sceneImages, isGeneratingScene, currentSceneDesc, generateSceneImage, resetImages };
}
