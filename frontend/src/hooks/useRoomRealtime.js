import { useCallback, useEffect, useRef, useState } from 'react';
import { createEcho } from '../lib/echo';
import { PARTNER_ROLE } from '../lib/api';

const ACTIVITY_RESET_MS = 4000;

/**
 * Berlangganan channel Reverb milik peran sendiri + presence channel bersama.
 *
 *  private-room.{code}.{role}  → 'room.updated', 'game.phase_changed', 'shop.updated' (payload sudah difilter server)
 *  presence-room.{code}.presence → siapa yang online + client whisper 'activity', 'hint_ping', 'nudge'
 *
 * partnerActivity: 'idle' | 'typing' | 'running' (dari whisper pasangan)
 */
export function useRoomRealtime({
  token, roomCode, role, onEvaluated, onRoomUpdated, onPhaseChanged, onShopUpdated, onHint, onNudge,
}) {
  const [connection, setConnection] = useState('connecting');
  const [onlineRoles, setOnlineRoles] = useState([]);
  const [partnerActivity, setPartnerActivity] = useState('idle');
  const presenceRef = useRef(null);
  const resetTimerRef = useRef(null);
  const handlersRef = useRef({});
  handlersRef.current = { onEvaluated, onRoomUpdated, onPhaseChanged, onShopUpdated, onHint, onNudge };

  useEffect(() => {
    if (!token || !roomCode || !role) return undefined;

    const echo = createEcho(token);
    const pusher = echo.connector.pusher;
    pusher.connection.bind('state_change', ({ current }) => setConnection(current));

    echo
      .private(`room.${roomCode}.${role}`)
      .listen('.mission.evaluated', (payload) => handlersRef.current.onEvaluated?.(payload))
      .listen('.room.updated', (payload) => handlersRef.current.onRoomUpdated?.(payload))
      .listen('.game.phase_changed', (payload) => handlersRef.current.onPhaseChanged?.(payload))
      .listen('.shop.updated', (payload) => handlersRef.current.onShopUpdated?.(payload));

    const presence = echo
      .join(`room.${roomCode}.presence`)
      .here((members) => setOnlineRoles(members.map((m) => m.role)))
      .joining((m) => setOnlineRoles((r) => [...new Set([...r, m.role])]))
      .leaving((m) => {
        setOnlineRoles((r) => r.filter((x) => x !== m.role));
        setPartnerActivity('idle');
      })
      .listenForWhisper('activity', ({ state }) => {
        setPartnerActivity(state);
        clearTimeout(resetTimerRef.current);
        if (state !== 'idle') {
          resetTimerRef.current = setTimeout(() => setPartnerActivity('idle'), ACTIVITY_RESET_MS);
        }
      })
      // Petunjuk yang sengaja disorot Konsultan (client whisper, tidak disimpan ke database).
      .listenForWhisper('hint_ping', (payload) => handlersRef.current.onHint?.(payload))
      // Colekan "aku sudah siap, ayo!" dari partner (client whisper).
      .listenForWhisper('nudge', (payload) => handlersRef.current.onNudge?.(payload));
    presenceRef.current = presence;

    return () => {
      clearTimeout(resetTimerRef.current);
      presenceRef.current = null;
      echo.disconnect();
    };
  }, [token, roomCode, role]);

  /** Kirim status ringan ke pasangan (tidak disimpan ke database). */
  const sendActivity = useCallback((state) => {
    try {
      presenceRef.current?.whisper('activity', { state });
    } catch {
      /* koneksi belum siap */
    }
  }, []);

  /** Konsultan → Teknisi: sorot satu aturan/rumus/variabel. @returns {boolean} terkirim atau tidak */
  const sendHint = useCallback((payload) => {
    try {
      if (!presenceRef.current) return false;
      presenceRef.current.whisper('hint_ping', payload);
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Colek partner (mis. di prolog saat kita sudah siap). @returns {boolean} terkirim atau tidak */
  const sendNudge = useCallback((payload) => {
    try {
      if (!presenceRef.current) return false;
      presenceRef.current.whisper('nudge', payload);
      return true;
    } catch {
      return false;
    }
  }, []);

  const partnerRole = PARTNER_ROLE[role];

  return {
    connection,
    isConnected: connection === 'connected',
    partnerOnline: onlineRoles.includes(partnerRole),
    partnerActivity,
    sendActivity,
    sendHint,
    sendNudge,
  };
}
