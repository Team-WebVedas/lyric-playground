
import { useState, useEffect, useCallback } from "react";
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
}

const Game = () => {
  const { songId } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [typedText, setTypedText] = useState("");
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<GameState>({
    currentLyrics: [],
    currentLineIndex: 0,
    typedCharacters: 0,
    correctCharacters: 0,
    startTime: null,
    songTitle: "",
    artistName: "",
  });

  // Fetch song data when component mounts
  useEffect(() => {
    const fetchSongData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-songs", {
          body: { spotify_id: songId },
        });

        if (error) throw error;

        if (data && data[0]) {
          const song = data[0];
          setGameState(prev => ({
            ...prev,
            currentLyrics: song.lyrics.split('\n').filter(Boolean),
            songTitle: song.title,
            artistName: song.artist,
          }));
        }
      } catch (error) {
        toast({
          title: "Error loading song",
          description: "Please try again later",
          variant: "destructive",
        });
      }
    };

    fetchSongData();
  }, [songId, toast]);

  const resetGame = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setTypedText("");
    setGameState(prev => ({
      ...prev,
      currentLineIndex: 0,
      typedCharacters: 0,
      correctCharacters: 0,
      startTime: null,
    }));
  }, []);

  const handlePlayPause = async () => {
    if (!isPlaying) {
      setIsPlaying(true);
      if (!gameState.startTime) {
        setGameState(prev => ({ ...prev, startTime: Date.now() }));
      }
    } else {
      setIsPlaying(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPlaying || !gameState.currentLyrics.length) return;

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

        // Calculate progress
        const newProgress = ((gameState.currentLineIndex + 1) / gameState.currentLyrics.length) * 100;
        setProgress(newProgress);

        if (gameState.currentLineIndex + 1 >= gameState.currentLyrics.length) {
          handleGameComplete();
        }
      }
    }
  };

  const handleGameComplete = async () => {
    if (!gameState.startTime) return;

    const timeElapsed = (Date.now() - gameState.startTime) / 1000 / 60; // in minutes
    const wpm = calculateWPM(gameState.typedCharacters, timeElapsed);
    const accuracy = calculateAccuracy(gameState.correctCharacters, gameState.typedCharacters);

    // Save progress to database
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

    setIsPlaying(false);
  };

  // Calculate current stats
  const calculateCurrentStats = () => {
    if (!gameState.startTime) return { wpm: 0, accuracy: 0 };
    
    const timeElapsed = (Date.now() - gameState.startTime) / 1000 / 60; // in minutes
    const wpm = calculateWPM(gameState.typedCharacters, timeElapsed);
    const accuracy = calculateAccuracy(gameState.correctCharacters, gameState.typedCharacters);
    
    return { wpm, accuracy };
  };

  const { wpm, accuracy } = calculateCurrentStats();

  const getLineColor = (index: number) => {
    if (index < gameState.currentLineIndex) return "text-green-500"; // Completed line
    if (index === gameState.currentLineIndex) return "text-primary"; // Current line
    return "text-muted-foreground"; // Future line
  };

  const getCharColor = (typedChar: string, correctChar: string) => {
    if (!typedChar) return "text-white";
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
          <Button
            variant="outline"
            size="icon"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Progress value={progress} className="w-full" />

        <div className="lyrics-container h-64 overflow-y-auto space-y-2">
          {gameState.currentLyrics.map((line, index) => (
            <div
              key={index}
              className={`lyric-line ${getLineColor(index)} ${
                index === gameState.currentLineIndex ? "font-medium" : ""
              }`}
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
          disabled={!isPlaying}
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
