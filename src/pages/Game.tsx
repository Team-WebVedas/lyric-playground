
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCw } from "lucide-react";

const Game = () => {
  const { songId } = useParams();
  const [currentLyrics, setCurrentLyrics] = useState<string[]>([]);
  const [typedText, setTypedText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Implementation for typing logic
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl glass-panel p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Song Title</h2>
            <p className="text-muted-foreground">Artist Name</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Progress value={progress} className="w-full" />

        <div className="lyrics-container h-64">
          {currentLyrics.map((line, index) => (
            <div
              key={index}
              className={`lyric-line ${
                index === 0 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {line}
            </div>
          ))}
        </div>

        <input
          type="text"
          className="w-full p-4 rounded-lg border typing-text"
          placeholder="Type the lyrics..."
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">WPM: 0</p>
            <p className="text-sm text-muted-foreground">Accuracy: 0%</p>
          </div>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Game;
