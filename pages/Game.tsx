
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Play, RotateCcw, ChevronLeft, Zap, User, Star, ListOrdered, Globe } from 'lucide-react';
import { supabase } from '../services/supabase';

const PLAYER_SPEED = 4.2;
const MAX_TURN_SPEED = 0.07;
const BODY_SPACING = 9;
const INITIAL_LENGTH = 6;

const COUNTRIES = [
  { id: 'NL', name: 'Netherlands', flag: '🇳🇱', color: '#ff6b29', secondary: '#FFFFFF', skins: ['#ffdbac', '#f1c27d'], hairs: ['#e5c298', '#d4a76a', '#8d5524', '#4b2c20', '#1a1a1a', '#c68642', '#d1d1d1', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'GB', name: 'Great Britain', flag: '🇬🇧', color: '#f4191b', secondary: '#1d244a', detail: '#FFFFFF', skins: ['#ffdbac', '#f1c27d'], hairs: ['#1a1a1a', '#4b2c20', '#d4a76a', '#e5c298', '#c68642', '#d1d1d1', '#8d5524', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'AU', name: 'Australia', flag: '🇦🇺', color: '#fefd34', secondary: '#103339', skins: ['#ffdbac', '#f1c27d'], hairs: ['#d4a76a', '#e5c298', '#4b2c20', '#c68642', '#1a1a1a', '#d1d1d1', '#8d5524', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'DE', name: 'Germany', flag: '🇩🇪', color: '#f4f6fd', secondary: '#f7d134', detail: '#dbe2fa', skins: ['#ffdbac', '#f1c27d'], hairs: ['#e5c298', '#d4a76a', '#4b2c20', '#1a1a1a', '#8d5524', '#c68642', '#d1d1d1', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'BE', name: 'Belgium', flag: '🇧🇪', color: '#d51311', secondary: '#FFFFFF', skins: ['#ffdbac', '#f1c27d'], hairs: ['#4b2c20', '#2d1b14', '#e5c298', '#1a1a1a', '#c68642', '#d1d1d1', '#d4a76a', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'ES', name: 'Spain', flag: '🇪🇸', color: '#ba0d09', secondary: '#F1BF00', detail: '#FFFFFF', skins: ['#ffdbac', '#f1c27d'], hairs: ['#1a1a1a', '#2d1b14', '#4b2c20', '#8d5524', '#c68642', '#d1d1d1', '#e5c298', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'AR', name: 'Argentina', flag: '🇦🇷', color: '#97bae0', secondary: '#FFFFFF', skins: ['#ffdbac', '#f1c27d'], hairs: ['#1a1a1a', '#2d1b14', '#4b2c20', '#8d5524', '#c68642', '#d1d1d1', '#e5c298', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'IE', name: 'Ireland', flag: '🇮🇪', color: '#00be69', secondary: '#FFFFFF', skins: ['#ffdbac', '#f1c27d'], hairs: ['#c68642', '#d4a76a', '#4b2c20', '#8d5524', '#2d1b14', '#d1d1d1', '#e5c298', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: '#013199', secondary: '#FFFFFF', skins: ['#ffdbac', '#f1c27d'], hairs: ['#c68642', '#d4a76a', '#8d5524', '#4b2c20', '#1a1a1a', '#d1d1d1', '#e5c298', '#7d5e4a', '#a58d7d', '#5c3e31'] },
  { id: 'IN', name: 'India', flag: '🇮🇳', color: '#9bcaf8', secondary: '#0165f3', skins: ['#ab7b4c', '#8d5524', '#c68642'], hairs: ['#000000', '#2d1b14'] },
];

interface Point {
  x: number;
  y: number;
  angle: number;
  lean: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  type: 'grass' | 'goal';
}

interface RankingEntry {
  name: string;
  score: number;
  date: string;
  country: string;
  gender: 'mens' | 'womens';
}

const Game: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [username, setUsername] = useState(localStorage.getItem('field_hockey_username') || '');
  const [gender, setGender] = useState<'mens' | 'womens'>((localStorage.getItem('field_hockey_gender') as 'mens' | 'womens') || 'mens');
  const [countryId, setCountryId] = useState(localStorage.getItem('field_hockey_country') || 'NL');
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [globalRankings, setGlobalRankings] = useState<RankingEntry[]>([]);
  const [shake, setShake] = useState(0);
  const [goalPopup, setGoalPopup] = useState<{x: number, y: number, life: number, text: string} | null>(null);
  
  const selectedCountry = COUNTRIES.find(c => c.id === countryId) || COUNTRIES[0];

  // Logic refs
  const headRef = useRef<Point>({ x: 0, y: 0, angle: -Math.PI / 2, lean: 0 });
  const pathRef = useRef<Point[]>([]);
  const foodRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const targetRef = useRef<{ x: number, y: number } | null>(null);
  const lengthRef = useRef(INITIAL_LENGTH);
  const segmentColorsRef = useRef<string[]>([]);
  const segmentHairColorsRef = useRef<string[]>([]);
  const segmentSkinColorsRef = useRef<string[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(null);
  const runFrameRef = useRef(0);
  const grassRef = useRef<{x: number, y: number, angle: number, life: number}[]>([]);

  useEffect(() => {
    // Auth - Persistent User ID
    let persistentId = localStorage.getItem('field_hockey_uuid');
    if (!persistentId) {
      persistentId = crypto.randomUUID();
      localStorage.setItem('field_hockey_uuid', persistentId);
    }
    setCurrentUser({ uid: persistentId });

    // Global Leaderboard Fetch & Subscribe
    const fetchRankings = async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);
      
      if (data) {
        setGlobalRankings(data.map((r: any) => ({
          ...r,
          date: new Date(r.created_at).toLocaleDateString()
        })));
      }
      if (error) console.error("Supabase Error:", error);
    };

    fetchRankings();

    // Set up Realtime subscription
    const channel = supabase
      .channel('public:leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
        fetchRankings();
      })
      .subscribe();

    const savedScore = localStorage.getItem('field_hockey_highscore');
    if (savedScore) setHighScore(parseInt(savedScore));

    const savedRankings = localStorage.getItem('field_hockey_rankings');
    if (savedRankings) setRankings(JSON.parse(savedRankings));

    const w = window.innerWidth;
    const h = window.innerHeight;
    headRef.current = { x: w / 2, y: h * 0.7, angle: -Math.PI / 2, lean: 0 };
    
    pathRef.current = Array(200).fill(0).map((_, i) => ({ 
      ...headRef.current, 
      y: headRef.current.y + (i * 2) 
    }));
    
    spawnFood();
    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  const spawnFood = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const padding = 60;
    foodRef.current = {
      x: padding + Math.random() * (w - padding * 2),
      y: 180 + Math.random() * (h - 250)
    };
  };

  const handleGameOver = useCallback(async (finalScore: number) => {
    setIsGameOver(true);
    targetRef.current = null;
    const currentPlayerName = username.trim() || 'Unknown Player';
    const entry: RankingEntry = {
      name: currentPlayerName,
      score: finalScore,
      country: countryId,
      gender: gender,
      date: new Date().toLocaleDateString('en-US')
    };
    
    // Save to Supabase
    if (currentUser?.uid) {
      try {
        // Fetch existing high score for this user
        const { data: existing } = await supabase
          .from('leaderboard')
          .select('score')
          .eq('uid', currentUser.uid)
          .single();

        if (!existing || finalScore > existing.score) {
          await supabase
            .from('leaderboard')
            .upsert({
              uid: currentUser.uid,
              name: currentPlayerName,
              score: finalScore,
              country: countryId,
              gender: gender,
              created_at: new Date().toISOString()
            }, { onConflict: 'uid' });
        }
      } catch (error) {
        console.error("Error saving score:", error);
      }
    }

    const currentRankings = [...rankings];
    const existingIndex = currentRankings.findIndex(r => r.name.toLowerCase() === currentPlayerName.toLowerCase());
    
    let updatedRankings: RankingEntry[];
    if (existingIndex !== -1) {
      if (finalScore > currentRankings[existingIndex].score) {
        currentRankings[existingIndex] = entry;
      }
      updatedRankings = currentRankings;
    } else {
      updatedRankings = [...currentRankings, entry];
    }

    updatedRankings = updatedRankings
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    setRankings(updatedRankings);
    localStorage.setItem('field_hockey_rankings', JSON.stringify(updatedRankings));
    
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('field_hockey_highscore', finalScore.toString());
    }
  }, [rankings, username, highScore, countryId, gender]);

  const resetGame = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    headRef.current = { x: w / 2, y: h * 0.7, angle: -Math.PI / 2, lean: 0 };
    pathRef.current = Array(200).fill(0).map((_, i) => ({ ...headRef.current, y: headRef.current.y + i }));
    lengthRef.current = INITIAL_LENGTH;
    
    const country = COUNTRIES.find(c => c.id === countryId) || COUNTRIES[0];
    segmentHairColorsRef.current = Array(INITIAL_LENGTH).fill('').map(() => country.hairs[Math.floor(Math.random() * country.hairs.length)]);
    segmentSkinColorsRef.current = Array(INITIAL_LENGTH).fill('').map(() => country.skins[Math.floor(Math.random() * country.skins.length)]);
    
    targetRef.current = null;
    setScore(0);
    setIsGameOver(false);
    setIsPaused(true);
    setShowNamePrompt(true);
    spawnFood();
    grassRef.current = [];
  };

  const update = useCallback(() => {
    if (isPaused || isGameOver || showNamePrompt) return;

    const head = headRef.current;
    
    if (targetRef.current) {
      const targetAngle = Math.atan2(targetRef.current.y - head.y, targetRef.current.x - head.x);
      let diff = targetAngle - head.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const turnAmount = Math.max(-MAX_TURN_SPEED, Math.min(MAX_TURN_SPEED, diff));
      head.angle += turnAmount;
      head.lean = turnAmount * 15;

      if (Math.abs(turnAmount) > MAX_TURN_SPEED * 0.5) {
        if (Math.random() > 0.5) {
           particlesRef.current.push({
             x: head.x, y: head.y,
             vx: -Math.cos(head.angle) * 2 + (Math.random() - 0.5),
             vy: -Math.sin(head.angle) * 2 + (Math.random() - 0.5),
             life: 0.6, size: Math.random() * 2 + 1, type: 'grass'
           });
        }
      }
    } else {
      head.lean *= 0.9;
    }

    head.x += Math.cos(head.angle) * PLAYER_SPEED;
    head.y += Math.sin(head.angle) * PLAYER_SPEED;

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (head.x < 0) head.x = w; if (head.x > w) head.x = 0;
    if (head.y < 0) head.y = h; if (head.y > h) head.y = 0;

    pathRef.current.unshift({ ...head });
    if (pathRef.current.length > 600) pathRef.current.pop();

    const dx = head.x - foodRef.current.x;
    const dy = head.y - foodRef.current.y;
    if (Math.sqrt(dx*dx + dy*dy) < 35) {
      const newScore = score + 10;
      setScore(newScore);
      setShake(10);
      const phrases = ['Nice!', 'Go!', 'Yeah!', 'Awesome!', 'Pro!', 'Clean!', 'Top!'];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      setGoalPopup({ x: foodRef.current.x, y: foodRef.current.y, life: 1.0, text: randomPhrase });
      lengthRef.current += 1;
      segmentHairColorsRef.current.push(selectedCountry.hairs[Math.floor(Math.random() * selectedCountry.hairs.length)]);
      segmentSkinColorsRef.current.push(selectedCountry.skins[Math.floor(Math.random() * selectedCountry.skins.length)]);
      spawnFood();
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({
          x: foodRef.current.x, y: foodRef.current.y,
          vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
          life: 1.0, size: Math.random() * 4 + 2, type: 'goal'
        });
      }
    }

    for (let i = BODY_SPACING * 4; i < lengthRef.current * BODY_SPACING; i += 5) {
      const p = pathRef.current[i];
      if (p) {
        const cdx = head.x - p.x;
        const cdy = head.y - p.y;
        if (Math.sqrt(cdx*cdx + cdy*cdy) < 18) {
          handleGameOver(score);
        }
      }
    }

    runFrameRef.current += 0.2;
    if (shake > 0) setShake(s => Math.max(0, s - 0.5));
    if (goalPopup) {
      setGoalPopup(p => p ? { ...p, life: p.life - 0.02, y: p.y - 1 } : null);
      if (goalPopup.life <= 0) setGoalPopup(null);
    }
  }, [isPaused, isGameOver, showNamePrompt, score, handleGameOver, shake, goalPopup]);

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Point, index: number) => {
    const isHead = index === 0;
    const size = 20;
    const jerseyColor = selectedCountry.color;
    const shortsColor = selectedCountry.secondary;
    const hairColor = segmentHairColorsRef.current[index] || selectedCountry.hairs[0];
    const skinColor = segmentSkinColorsRef.current[index] || selectedCountry.skins[0];
    
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + Math.PI / 2);
    ctx.scale(1 - Math.abs(p.lean) * 0.02, 1);
    ctx.rotate(p.lean * 0.1);

    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowOffsetY = 5;

    // 1. Jersey (Body)
    ctx.fillStyle = jerseyColor;
    ctx.beginPath();
    ctx.roundRect(-size * 0.8, -12, size * 1.6, 22, 6);
    ctx.fill();

    // Subtle RIM highlight for volume without changing core color
    const rimGrad = ctx.createLinearGradient(-size * 0.8, -12, size * 0.8, 10);
    rimGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
    rimGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Secondary Jersey Detail (V-neck or trim)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -12);
    ctx.lineTo(0, -6);
    ctx.lineTo(size * 0.3, -12);
    ctx.stroke();

    // Side mesh detail
    ctx.fillStyle = selectedCountry.detail || 'rgba(0,0,0,0.1)';
    ctx.fillRect(-size * 0.8, -4, 3, 8);
    ctx.fillRect(size * 0.8 - 3, -4, 3, 8);

    // 2. Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, -size * 0.7, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    
    // Head detail (Eyes)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(-size * 0.15, -size * 0.75, 1.5, 0, Math.PI * 2);
    ctx.arc(size * 0.15, -size * 0.75, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair/Details
    ctx.fillStyle = hairColor;
    if (gender === 'womens') {
      // Ponytail for women
      ctx.beginPath();
      ctx.arc(0, -size * 0.7, size * 0.45, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-size * 0.45, -size * 0.7, size * 0.9, size * 0.3);

      ctx.save();
      ctx.translate(0, -size * 0.3);
      const tailSway = Math.sin(runFrameRef.current * 2 + index * 0.5) * 0.3;
      ctx.rotate(tailSway);
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.bezierCurveTo(-5, 8, 5, 12, 2, 20);
      ctx.bezierCurveTo(8, 12, 8, 8, 2, 0);
      ctx.fill();
      
      ctx.fillStyle = jerseyColor;
      ctx.fillRect(-3, -1, 6, 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(0, -size * 0.7, size * 0.45, Math.PI, 0);
      ctx.fill();
    }

    const sway = Math.sin(runFrameRef.current + index * 0.8) * 8;
    
    // Arms
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(-size * 0.9, 0 + sway * 0.2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.9, 0 - sway * 0.2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Running legs with shorts
    ctx.fillStyle = shortsColor; 
    ctx.fillRect(-size * 0.6, 8, 5, 6);
    ctx.fillRect(size * 0.2, 8, 5, 6);

    // Socks & Shoes
    ctx.fillStyle = jerseyColor; // Socks match jersey
    ctx.fillRect(-size * 0.6 + (sway/4), 14, 5, 8);
    ctx.fillRect(size * 0.2 - (sway/4), 14, 5, 8);
    
    // Trim on socks if secondary exists
    ctx.fillStyle = shortsColor;
    ctx.fillRect(-size * 0.6 + (sway/4), 14, 5, 2);
    ctx.fillRect(size * 0.2 - (sway/4), 14, 5, 2);
    
    ctx.fillStyle = '#111'; 
    ctx.beginPath();
    ctx.roundRect(-size * 0.7 + (sway/4), 22, 8, 4, 2);
    ctx.roundRect(size * 0.1 - (sway/4), 22, 8, 4, 2);
    ctx.fill();

    if (isHead) {
      ctx.save();
      ctx.translate(size * 0.85, 2);
      ctx.rotate(sway * 0.05);
      ctx.shadowBlur = 10;
      ctx.shadowColor = selectedCountry.secondary;
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.6, size * 1.3);
      ctx.stroke();
      
      ctx.strokeStyle = selectedCountry.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size * 0.1, size * 0.2);
      ctx.lineTo(size * 0.4, size * 0.8);
      ctx.stroke();
      
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(size * 0.9, size * 1.3, 6, Math.PI, Math.PI * 0.4, true);
      ctx.stroke();
      
      ctx.strokeStyle = selectedCountry.secondary;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.25, size * 0.5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '900 8px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(isHead ? selectedCountry.id : (index).toString(), 0, 4);
    ctx.restore();
  };

  const drawField = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // 1. Base Stadium Floor (Water-based blue turf)
    ctx.fillStyle = '#023ad0'; 
    ctx.fillRect(0, 0, w, h);

    // 2. Subtle center depth
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
    gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 3. Field Lines (Standard White)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;

    // Perimeter
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Center Line
    ctx.beginPath();
    ctx.moveTo(20, h / 2);
    ctx.lineTo(w - 20, h / 2);
    ctx.stroke();

    // Center Circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // 23m Lines (scaled)
    const twentyThreeM = h * 0.25;
    ctx.beginPath();
    ctx.moveTo(20, twentyThreeM);
    ctx.lineTo(w - 20, twentyThreeM);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, h - twentyThreeM);
    ctx.lineTo(w - 20, h - twentyThreeM);
    ctx.stroke();

    // Shooting Circles (The "D")
    const dRadius = Math.min(w * 0.3, 150);
    
    // Top D
    ctx.beginPath();
    ctx.arc(w / 2, 20, dRadius, 0, Math.PI);
    ctx.stroke();
    
    // Bottom D
    ctx.beginPath();
    ctx.arc(w / 2, h - 20, dRadius, Math.PI, 0);
    ctx.stroke();

    // Penalty Spots
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(w / 2, 20 + dRadius * 0.6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2, h - 20 - dRadius * 0.6, 4, 0, Math.PI * 2); ctx.fill();

    // Goals (Visual only)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    const goalWidth = w * 0.25;
    ctx.strokeRect(w/2 - goalWidth/2, 5, goalWidth, 15);
    ctx.strokeRect(w/2 - goalWidth/2, h - 20, goalWidth, 15);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawField(ctx, w, h);
    
    // Ball (Field Hockey Ball is usually white or yellow)
    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(foodRef.current.x, foodRef.current.y, 12, 0, Math.PI*2); ctx.fill();
    
    // Ball texture (dimples)
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for(let a=0; a<Math.PI*2; a+=Math.PI/4) {
      ctx.beginPath();
      ctx.arc(foodRef.current.x + Math.cos(a)*6, foodRef.current.y + Math.sin(a)*6, 2, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    for (let i = lengthRef.current - 1; i >= 0; i--) {
      const p = pathRef.current[i * BODY_SPACING];
      if (p) drawPlayer(ctx, p, i);
    }

    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.type === 'grass' ? `rgba(149,255,3,${p.life})` : `rgba(255,255,255,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    if (targetRef.current && !isPaused && !isGameOver && !showNamePrompt) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(headRef.current.x, headRef.current.y);
      ctx.lineTo(targetRef.current.x, targetRef.current.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (goalPopup) {
      ctx.save();
      ctx.globalAlpha = goalPopup.life;
      ctx.fillStyle = '#95ff03';
      ctx.font = '900 44px Inter';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#95ff03';
      ctx.fillText(goalPopup.text, goalPopup.x, goalPopup.y);
      ctx.restore();
    }

    // Vignette effect
    const vignette = ctx.createRadialGradient(w/2, h/2, h/4, w/2, h/2, h);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }, [isPaused, isGameOver, showNamePrompt, shake, goalPopup]);

  const loop = useCallback(() => {
    update();
    draw();
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [loop]);

  const handleInteraction = (e: React.PointerEvent) => {
    if (isGameOver || showNamePrompt) return;
    if (isPaused) { setIsPaused(false); return; }
    targetRef.current = { x: e.clientX, y: e.clientY };
  };

  const saveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem('field_hockey_username', username.trim());
      localStorage.setItem('field_hockey_gender', gender);
      localStorage.setItem('field_hockey_country', countryId);
      setShowNamePrompt(false);
      setIsPaused(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[140] bg-[#0a0a0a] flex flex-col overflow-hidden select-none touch-none"
      onPointerMove={handleInteraction}
      onPointerDown={handleInteraction}
    >
      {/* Back to News */}
      {(showNamePrompt || isPaused) && !isGameOver && (
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 z-[250] flex items-center gap-2 text-white/40 hover:text-[#95ff03] transition-colors group pointer-events-auto"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#95ff03]/10">
            <ChevronLeft size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest italic">Back to News</span>
        </button>
      )}

      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight}
        className="absolute inset-0 w-full h-full cursor-crosshair" 
      />

      {/* Sleek Scoreboard - Adjusted for iOS Safe Area */}
      <div className="absolute left-0 right-0 z-[150] px-3 md:px-6 flex justify-between items-start pointer-events-none" style={{ top: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex flex-col gap-1 animate-pro-in">
           <div className="flex items-center gap-2 md:gap-3">
              <div 
                className="w-1 md:w-1.5 h-6 md:h-8 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                style={{ backgroundColor: selectedCountry.color }}
              />
              <div className="flex flex-col">
                <h1 className="font-sports text-sm md:text-xl font-black text-white italic leading-none tracking-tight">
                  {selectedCountry.name} <span style={{ color: selectedCountry.color }}>{selectedCountry.flag}</span>
                </h1>
                <div className="flex items-center gap-1.5">
                  <span className="text-[6px] md:text-[8px] font-black text-white/50 tracking-[0.2em] leading-none">{username || 'Player'}</span>
                  <div className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-white/20" />
                  <span className="text-[6px] md:text-[8px] font-black tracking-[0.2em] leading-none capitalize" style={{ color: selectedCountry.color }}>{gender}</span>
                </div>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="bg-white/5 backdrop-blur-xl px-4 md:px-6 py-2 md:py-4 rounded-[1rem] md:rounded-[1.5rem] border border-white/10 flex items-center gap-6 md:gap-10 shadow-2xl pointer-events-auto relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="flex flex-col items-center relative z-10">
                <span className="text-[6px] md:text-[8px] font-black text-white/40 tracking-[0.2em] mb-0.5 md:mb-1">Score</span>
                <span className="font-sports text-xl md:text-3xl text-[#95ff03] italic font-black leading-none drop-shadow-[0_0_10px_rgba(149,255,3,0.3)]">{score}</span>
             </div>
             <div className="w-px h-6 md:h-10 bg-white/10" />
             <div className="flex flex-col items-center relative z-10">
                <span className="text-[6px] md:text-[8px] font-black text-white/40 tracking-[0.2em] mb-0.5 md:mb-1">Best</span>
                <span className="font-sports text-xl md:text-3xl text-white italic font-black leading-none">{highScore}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Username Prompt */}
      {showNamePrompt && (
        <div className="absolute inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-black/80 backdrop-blur-3xl border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-pro-in relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#95ff03]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#003ad0]/10 rounded-full blur-3xl" />
            
            <div className="flex justify-center mb-4 md:mb-6 relative z-10 font-black italic">
               <img src="https://www.hockeyrefresh.com/logo-dark.png" alt="Refresh Hockey" className="h-6 md:h-8 w-auto object-contain" referrerPolicy="no-referrer" />
            </div>
            
            <div className="flex flex-col items-center mb-3 md:mb-5 relative z-10">
              <h2 className="font-sports text-lg md:text-2xl font-black text-white italic tracking-tighter">
                Team Conditioning Session
              </h2>
              <span className="bg-[#95ff03] text-black text-[6px] md:text-[8px] px-2 py-0.5 rounded-[4px] font-black uppercase tracking-widest mt-1 italic font-sports">
                Snake Game
              </span>
            </div>
            <p className="text-white/40 text-[6px] md:text-[8px] font-bold tracking-[0.2em] text-center mb-1 md:mb-2 relative z-10">
              Choose your options for this session
            </p>
            
            <form onSubmit={saveUsername} className="space-y-4 md:space-y-6 relative z-10">
              <input 
                autoFocus
                type="text" 
                maxLength={12}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-4 md:py-5 text-white font-sports text-xl md:text-2xl italic font-black focus:outline-none focus:border-[#95ff03] transition-all text-center placeholder:text-white/10"
              />
              
              <div className="grid grid-cols-5 gap-2 max-h-24 md:max-h-32 overflow-y-auto p-1 custom-scrollbar">
                {COUNTRIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCountryId(c.id)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl border transition-all ${countryId === c.id ? 'bg-white/10 border-white/40 scale-105' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                    title={c.name}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-[6px] font-black tracking-tighter mt-1 opacity-60">{c.id}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setGender('mens')}
                  className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-sports text-xs md:text-sm italic transition-all border-2 ${gender === 'mens' ? 'bg-[#003ad0] border-[#003ad0] text-white shadow-[0_10px_20px_rgba(0,58,208,0.3)] scale-[1.02]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                >
                  Mens
                </button>
                <button
                  type="button"
                  onClick={() => setGender('womens')}
                  className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-sports text-xs md:text-sm italic transition-all border-2 ${gender === 'womens' ? 'bg-[#003ad0] border-[#003ad0] text-white shadow-[0_10px_20px_rgba(0,58,208,0.3)] scale-[1.02]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                >
                  Womens
                </button>
              </div>
              
              <button 
                type="submit"
                disabled={!username.trim()}
                className="w-full bg-[#95ff03] disabled:opacity-50 text-black py-4 md:py-6 rounded-xl md:rounded-2xl font-sports font-black text-xl md:text-2xl italic tracking-widest shadow-[0_20px_40px_rgba(149,255,3,0.2)] hover:brightness-110 active:scale-95 transition-all uppercase"
              >
                PLAY!
              </button>
            </form>
          </div>
        </div>
      )}

      {(isPaused || isGameOver) && !showNamePrompt && (
        <div className="absolute inset-0 z-[160] bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-8 text-center overflow-y-auto" onPointerDown={(e) => e.stopPropagation()}>
          {isGameOver ? (
            <div className="animate-pro-in w-full max-w-xl flex flex-col items-center py-4 md:py-10 my-auto">
              <h2 className="font-sports text-4xl md:text-8xl italic font-black text-[#95ff03] mb-1 md:mb-2 tracking-tighter drop-shadow-[0_0_30px_rgba(149,255,3,0.4)] uppercase">Match Over</h2>
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-10">
                <span className="text-2xl md:text-4xl">{selectedCountry.flag}</span>
                <p className="text-white/60 text-[10px] md:text-[14px] font-black tracking-[0.5em] italic uppercase">Score: {score}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 w-full mb-6 md:mb-12">
                {/* Local Rankings */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-6 shadow-2xl relative overflow-hidden">
                   <h3 className="font-sports text-[8px] md:text-[10px] font-black text-white/40 mb-3 md:mb-6 tracking-[0.3em] flex items-center justify-center gap-2 md:gap-3 uppercase">
                     <User size={12} className="text-[#95ff03]" /> Personal Bests
                   </h3>
                   <div className="space-y-1.5 md:space-y-2">
                      {rankings.map((r, i) => (
                        <div key={i} className={`flex items-center justify-between px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all ${r.score === score && i === 0 ? 'bg-[#95ff03]/10 border border-[#95ff03]/20' : 'bg-white/5'}`}>
                           <span className="font-sports font-black italic text-base md:text-lg text-white/20">{i + 1}</span>
                           <span className="font-sports font-black italic text-[9px] md:text-[10px] text-white overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px] uppercase">{r.name}</span>
                           <span className="font-sports font-black italic text-base md:text-lg text-white">{r.score}</span>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Global Leaderboard */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-6 shadow-2xl relative overflow-hidden">
                   <h3 className="font-sports text-[8px] md:text-[10px] font-black text-white/40 mb-3 md:mb-6 tracking-[0.3em] flex items-center justify-center gap-2 md:gap-3 uppercase">
                     <Globe size={12} className="text-[#003ad0]" /> World Rankings
                   </h3>
                   <div className="space-y-1.5 md:space-y-2">
                      {globalRankings.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-white/5 rounded-xl border border-white/5">
                           <div className="flex items-center gap-2">
                             <span className={`font-sports font-black italic text-base md:text-lg ${i === 0 ? 'text-[#95ff03]' : 'text-white/20'}`}>{i + 1}</span>
                             <span className="text-xs md:text-sm">{COUNTRIES.find(c => c.id === r.country)?.flag}</span>
                             <div className="flex flex-col">
                               <span className="font-sports font-black italic text-[9px] md:text-[10px] text-white leading-none overflow-hidden text-ellipsis whitespace-nowrap max-w-[60px] uppercase">{r.name}</span>
                               <span className="text-[6px] font-black text-white/30 tracking-[0.1em] mt-0.5 uppercase">{r.gender === 'womens' ? 'W' : 'M'}</span>
                             </div>
                           </div>
                           <span className="font-sports font-black italic text-base md:text-lg text-white">{r.score}</span>
                        </div>
                      ))}
                      {globalRankings.length === 0 && <p className="text-white/20 font-sports italic text-[8px] md:text-[10px] text-center py-2 md:py-4 tracking-widest uppercase">Connecting...</p>}
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:gap-4 items-center w-full max-w-[280px] md:max-w-none">
                <button 
                  onClick={resetGame}
                  className="w-full md:w-auto bg-[#95ff03] text-black px-8 md:px-12 py-3 md:py-5 rounded-full font-sports font-black text-lg md:text-xl italic tracking-widest shadow-[0_20px_40px_rgba(149,255,3,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase"
                >
                  <RotateCcw className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" /> Play Again
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-pro-in max-w-lg py-6 md:py-10 my-auto">
              <div className="mb-8 md:mb-12 relative inline-block text-center flex flex-col items-center">
                <img src="https://www.hockeyrefresh.com/logo-dark.png" alt="Refresh Hockey" className="h-8 md:h-10 w-auto object-contain mb-6" referrerPolicy="no-referrer" />
                <h2 className="font-sports text-5xl md:text-9xl font-black text-white italic tracking-tighter leading-none uppercase">The<br/><span className="text-[#95ff03]">Pitch.</span></h2>
              </div>
              
              <p className="text-white/40 text-[9px] md:text-[11px] mb-8 md:mb-16 font-black tracking-[0.4em] max-w-sm mx-auto leading-loose italic uppercase">
                {username}, the stadium is waiting. <br/>Follow the target and dominate the turf.
              </p>
              
              <button 
                onClick={() => setIsPaused(false)}
                className="group relative"
              >
                <div className="absolute inset-0 bg-[#95ff03] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                <div className="relative bg-[#95ff03] text-black px-16 md:px-24 py-5 md:py-8 rounded-full font-sports font-black text-2xl md:text-4xl italic tracking-[0.2em] shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase">
                  Start
                </div>
              </button>
              
              <div className="mt-12 md:mt-16 flex items-center justify-center gap-6 md:gap-8 opacity-30">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center p-1">
                    <div className="w-1 h-2.5 bg-white rounded-full animate-bounce" />
                  </div>
                  <span className="text-[7px] md:text-[8px] font-black tracking-widest uppercase">Move</span>
                </div>
                <div className="w-px h-6 md:h-8 bg-white/20" />
                <div className="flex flex-col items-center gap-2">
                  <Star className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[7px] md:text-[8px] font-black tracking-widest uppercase">Collect</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Game;
