
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Play, BarChart2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-8">
      <div className="text-center space-y-4 animate-fade-in">
        <h1 className="text-4xl font-bold">Lyric Type</h1>
        <p className="text-muted-foreground">Practice typing with your favorite songs</p>
      </div>

      <div className="w-full max-w-md glass-panel p-6 space-y-4 animate-fade-in">
        <div className="flex space-x-2">
          <Input
            placeholder="Search for a song..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Song results will go here */}
          <div className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Song Title</h3>
                <p className="text-sm text-muted-foreground">Artist Name</p>
              </div>
              <Play className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <Link to="/stats">
          <Button variant="outline" className="glass-panel">
            <BarChart2 className="mr-2 h-4 w-4" />
            Your Stats
          </Button>
        </Link>
        <Link to="/leaderboard">
          <Button variant="outline" className="glass-panel">
            <Trophy className="mr-2 h-4 w-4" />
            Leaderboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
