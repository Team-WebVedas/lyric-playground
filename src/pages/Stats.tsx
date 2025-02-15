
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

const mockData = [
  { date: "Mon", wpm: 45 },
  { date: "Tue", wpm: 52 },
  { date: "Wed", wpm: 48 },
  { date: "Thu", wpm: 55 },
  { date: "Fri", wpm: 59 },
];

const Stats = () => {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">Your Stats</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-card">
            <span className="stat-value">52</span>
            <span className="stat-label">Average WPM</span>
          </Card>
          <Card className="stat-card">
            <span className="stat-value">98%</span>
            <span className="stat-label">Accuracy</span>
          </Card>
          <Card className="stat-card">
            <span className="stat-value">15</span>
            <span className="stat-label">Songs Completed</span>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Progress Over Time</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData}>
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
