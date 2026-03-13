'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveAPI } from '@/hooks/use-live-api';
import { useImageGeneration } from '@/hooks/use-image-generation';
import { initialWorldState, questTools, DM_SYSTEM_INSTRUCTION, applyHpChange, applyInventoryAdd, applyStatusEffect, buildBootstrapMessage } from '@/lib/engine';
import { AppView, WorldState, Item, Message, AIStudioWindow } from '@/lib/types';
import { LandingPage } from '@/components/LandingPage';
import { EndRecap } from '@/components/EndRecap';
import { SessionView } from '@/components/SessionView';
import { ApiKeyGate } from '@/components/ApiKeyGate';
import { DeathScreen } from '@/components/DeathScreen';
import { CharacterCreation, TRAIT_HP_BONUS } from '@/components/CharacterCreation';

export default function Home() {
  const [view, setView] = useState<AppView>('landing');
  const [mounted, setMounted] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [worldState, setWorldState] = useState<WorldState>(initialWorldState);
  const [messages, setMessages] = useState<Message[]>([]);
  const [characterCreated, setCharacterCreated] = useState(false);
  const bootstrappedRef = useRef(false);

  const dmTurnBufferRef = useRef('');
  const sendToolResponseRef = useRef<((responses: unknown[]) => void) | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  const { sceneImages, isGeneratingScene, currentSceneDesc, generateSceneImage, resetImages } = useImageGeneration();

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- required for hydration guard
    const win = window as unknown as AIStudioWindow;
    if (win.aistudio) {
      win.aistudio.hasSelectedApiKey().then(setHasApiKey);
    }
  }, []);

  const handleSelectKey = async () => {
    const win = window as unknown as AIStudioWindow;
    if (win.aistudio) {
      await win.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleMessage = useCallback((message: unknown) => {
    const msg = message as {
      serverContent?: {
        outputTranscription?: { text?: string };
        turnComplete?: boolean;
        interrupted?: boolean;
      };
      toolCall?: { functionCalls?: { id: string; name: string; args: Record<string, unknown> }[] };
    };

    // Interrupted means the DM was cut off — discard any partial transcription.
    if (msg.serverContent?.interrupted) {
      dmTurnBufferRef.current = '';
      return;
    }

    if (msg.serverContent?.outputTranscription?.text) {
      dmTurnBufferRef.current += msg.serverContent.outputTranscription.text;
    }

    if (msg.serverContent?.turnComplete) {
      const text = dmTurnBufferRef.current.trim();
      dmTurnBufferRef.current = '';
      if (text.length > 1) {
        setMessages(prev => [...prev, { role: 'DM', text, timestamp: Date.now() }]);
      }
    }

    const calls = msg.toolCall?.functionCalls;
    if (!calls?.length) return;

    const responses = calls.flatMap(call => {
      if (call.name === 'update_world_state') {
        setWorldState(prev => {
          if (call.args.currentLocation && call.args.currentLocation !== prev.currentLocation) resetImages();
          return { ...prev, ...call.args } as WorldState;
        });
        return [{ id: call.id, name: call.name, response: { result: 'State updated successfully.' } }];
      }
      if (call.name === 'resolve_skill_check') {
        setWorldState(prev => ({ ...prev, lastCheckResult: call.args.outcome as string }));
        return [{ id: call.id, name: call.name, response: { result: 'Check resolved.' } }];
      }
      if (call.name === 'trigger_visual_scene') {
        generateSceneImage(call.args.description as string, call.args.tone as string);
        return [{ id: call.id, name: call.name, response: { result: 'Visual scene triggered.' } }];
      }
      if (call.name === 'modify_player_hp') {
        setWorldState(prev => {
          const { state, died } = applyHpChange(prev, call.args.amount as number);
          if (died) {
            disconnectRef.current?.();
            setView('death');
          }
          return state;
        });
        return [{ id: call.id, name: call.name, response: { result: 'HP updated.' } }];
      }
      if (call.name === 'add_to_inventory') {
        setWorldState(prev => applyInventoryAdd(prev, call.args as unknown as Item));
        return [{ id: call.id, name: call.name, response: { result: 'Item added to inventory.' } }];
      }
      if (call.name === 'apply_status_effect') {
        setWorldState(prev => applyStatusEffect(prev, call.args.effect as string));
        return [{ id: call.id, name: call.name, response: { result: 'Status effect applied.' } }];
      }
      return [];
    });

    if (responses.length > 0) sendToolResponseRef.current?.(responses);
  }, [generateSceneImage, resetImages]);

  const { liveState, connect, disconnect, sendText, sendToolResponse } = useLiveAPI({
    systemInstruction: DM_SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations: questTools }],
    onMessage: handleMessage,
  });

  // Keep refs in sync so handleMessage always calls the latest callbacks.
  useEffect(() => { sendToolResponseRef.current = sendToolResponse; }, [sendToolResponse]);
  useEffect(() => { disconnectRef.current = disconnect; }, [disconnect]);

  // Send a one-shot bootstrap message the first time the session connects (after character creation).
  useEffect(() => {
    if (liveState === 'connected' && !bootstrappedRef.current && characterCreated) {
      bootstrappedRef.current = true;
      sendText(buildBootstrapMessage(worldState));
    }
  }, [liveState, sendText, worldState, characterCreated]);

  const handleRollDice = () => {
    if (liveState !== 'connected') return;
    const roll = Math.floor(Math.random() * 20) + 1;
    const label = roll === 20 ? '20 — Natural 20! Critical success!' : roll === 1 ? '1 — Critical fail!' : String(roll);
    setMessages(prev => [...prev, { role: 'Player', text: `[Rolled d20: ${label}]`, timestamp: Date.now() }]);
    sendText(`I rolled a ${roll} on my d20.`);
  };

  const handleEndSession = () => { disconnect(); setView('recap'); };

  const handleRestart = () => {
    disconnect();
    resetImages();
    setWorldState(initialWorldState);
    setMessages([]);
    setCharacterCreated(false);
    bootstrappedRef.current = false;
    setView('landing');
  };

  if (!mounted) return null;
  if (!hasApiKey) return <ApiKeyGate onSelectKey={handleSelectKey} />;
  if (view === 'landing') return <LandingPage onStart={() => setView('character-creation')} />;
  if (view === 'character-creation') return (
    <CharacterCreation
      onComplete={(name, role, trait) => {
        const hpBonus = TRAIT_HP_BONUS[trait] ?? 0;
        setWorldState({
          ...initialWorldState,
          playerName: name,
          playerRole: role,
          trait,
          maxHp: initialWorldState.maxHp + hpBonus,
          hp: initialWorldState.maxHp + hpBonus,
        });
        setCharacterCreated(true);
        setView('session');
      }}
    />
  );
  if (view === 'recap') return <EndRecap state={worldState} onRestart={handleRestart} />;
  if (view === 'death') return (
    <DeathScreen
      playerName={worldState.playerName}
      playerRole={worldState.playerRole}
      finalLocation={worldState.currentLocation}
      inventory={worldState.inventory}
      onRestart={handleRestart}
    />
  );

  return (
    <SessionView
      liveState={liveState}
      worldState={worldState}
      messages={messages}
      sceneImages={sceneImages}
      isGeneratingScene={isGeneratingScene}
      currentSceneDesc={currentSceneDesc}
      onConnect={connect}
      onEndSession={handleEndSession}
      onRollDice={handleRollDice}
    />
  );
}
