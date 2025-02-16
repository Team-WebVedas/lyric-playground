
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { calculateWPM, calculateAccuracy } from "@/utils/typing";

interface GameState {
  currentLyrics: string[];
  currentLineIndex: number;
  typedCharacters: number;
  correctCharacters: number;
  startTime: number | null;
  songTitle: string;
  artistName: string;
  timeLeft: number;
}

const GAME_DURATION = 30; // 30 seconds

const Game = () => {
  const { songId } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [typedText, setTypedText] = useState("");
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    currentLyrics: [],
    currentLineIndex: 0,
    typedCharacters: 0,
    correctCharacters: 0,
    startTime: null,
    songTitle: "",
    artistName: "",
    timeLeft: GAME_DURATION,
  });

  useEffect(() => {
    const fetchSongData = async () => {
      try {
        console.log('Fetching song data for ID:', songId);
        const { data, error } = await supabase.functions.invoke("search-songs", {
          body: { spotify_id: songId },
        });

        console.log('Response:', data, error);

        if (error) throw error;

        if (data && data[0]) {
          const song = data[0];
          setGameState(prev => ({
            ...prev,
            currentLyrics: song.lyrics.split('\n').filter(Boolean),
            songTitle: song.title,
            artistName: song.artist,
          }));

          // Initialize audio player if preview_url exists
          if (song.preview_url) {
            audioRef.current = new Audio(song.preview_url);
            audioRef.current.loop = true;
          }
        } else {
          throw new Error('Song not found');
        }
      } catch (error) {
        console.error('Error loading song:', error);
        toast({
          title: "Error loading song",
          description: "Please try again later",
          variant: "destructive",
        });
      }
    };

    if (songId) {
      fetchSongData();
    }

    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [songId, toast]);

  // Timer effect
  useEffect(() => {
    if (isPlaying && gameState.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          if (newTimeLeft <= 0) {
            handleGameComplete();
          }
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, gameState.timeLeft]);

  const resetGame = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setTypedText("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState(prev => ({
      ...prev,
      currentLineIndex: 0,
      typedCharacters: 0,
      correctCharacters: 0,
      startTime: null,
      timeLeft: GAME_DURATION,
    }));
  }, []);

  const handlePlayPause = async () => {
    if (!isPlaying) {
      setIsPlaying(true);
      if (!gameState.startTime) {
        setGameState(prev => ({ ...prev, startTime: Date.now() }));
      }
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    } else {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPlaying || !gameState.currentLyrics.length || gameState.timeLeft <= 0) return;

    const currentLine = gameState.currentLyrics[gameState.currentLineIndex];
    
    if (event.key === 'Enter') {
      if (typedText === currentLine) {
        setGameState(prev => ({
          ...prev,
          currentLineIndex: prev.currentLineIndex + 1,
          typedCharacters: prev.typedCharacters + typedText.length,
          correctCharacters: prev.correctCharacters + typedText.length,
        }));
        setTypedText("");

        const newProgress = ((gameState.currentLineIndex + 1) / gameState.currentLyrics.length) * 100;
        setProgress(newProgress);

        if (gameState.currentLineIndex + 1 >= gameState.currentLyrics.length) {
          handleGameComplete();
        }
      }
    }
  };

  const handleGameComplete = async () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!gameState.startTime) return;

    const timeElapsed = (Date.now() - gameState.startTime) / 1000 / 60; // in minutes
    const wpm = calculateWPM(gameState.typedCharacters, timeElapsed);
    const accuracy = calculateAccuracy(gameState.correctCharacters, gameState.typedCharacters);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_progress').insert({
          user_id: user.id,
          song_id: songId,
          wpm,
          accuracy,
        });

        toast({
          title: "Progress saved!",
          description: `WPM: ${wpm} | Accuracy: ${accuracy}%`,
        });
      }
    } catch (error) {
      toast({
        title: "Error saving progress",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const calculateCurrentStats = () => {
    if (!gameState.startTime) return { wpm: 0, accuracy: 0 };
    
    const timeElapsed = (Date.now() - gameState.startTime) / 1000 / 60;
    const wpm = calculateWPM(gameState.typedCharacters, timeElapsed);
    const accuracy = calculateAccuracy(gameState.correctCharacters, gameState.typedCharacters);
    
    return { wpm, accuracy };
  };

  const { wpm, accuracy } = calculateCurrentStats();

  const getLineColor = (index: number) => {
    if (index === gameState.currentLineIndex) return "text-white font-medium"; // Active line
    return "text-gray-500"; // Inactive line
  };

  const getCharColor = (typedChar: string, correctChar: string) => {
    if (!typedChar) return "";
    return typedChar === correctChar ? "text-green-500" : "text-red-500";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl glass-panel p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{gameState.songTitle}</h2>
            <p className="text-muted-foreground">{gameState.artistName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xl font-mono">
              {Math.max(0, gameState.timeLeft)}s
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              disabled={gameState.timeLeft <= 0}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Progress value={progress} className="w-full" />

        <div className="lyrics-container h-64 overflow-y-auto space-y-2">
          {gameState.currentLyrics.map((line, index) => (
            <div
              key={index}
              className={`lyric-line ${getLineColor(index)}`}
            >
              {index === gameState.currentLineIndex
                ? line.split("").map((char, charIndex) => (
                    <span
                      key={charIndex}
                      className={getCharColor(
                        typedText[charIndex],
                        char
                      )}
                    >
                      {char}
                    </span>
                  ))
                : line}
            </div>
          ))}
        </div>

        <input
          type="text"
          className="w-full p-4 rounded-lg border typing-text"
          placeholder={isPlaying ? "Type the lyrics..." : "Press play to start typing"}
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={!isPlaying || gameState.timeLeft <= 0}
        />

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">WPM: {wpm}</p>
            <p className="text-sm text-muted-foreground">Accuracy: {accuracy}%</p>
          </div>
          <Button variant="outline" size="icon" onClick={resetGame}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Game;
