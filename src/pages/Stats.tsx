
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const Stats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("get-user-stats", {
        headers: {
          "user-id": user.id,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold">Loading stats...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">Your Stats</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <span className="block text-3xl font-bold mb-2">{stats?.averageWpm || 0}</span>
            <span className="text-muted-foreground">Average WPM</span>
          </Card>
          <Card className="p-6 text-center">
            <span className="block text-3xl font-bold mb-2">{stats?.averageAccuracy || 0}%</span>
            <span className="text-muted-foreground">Accuracy</span>
          </Card>
          <Card className="p-6 text-center">
            <span className="block text-3xl font-bold mb-2">{stats?.songsCompleted || 0}</span>
            <span className="text-muted-foreground">Songs Completed</span>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Progress Over Time</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.progressData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="wpm"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Stats;
