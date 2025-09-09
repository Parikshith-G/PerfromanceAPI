import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [url, setUrl] = useState("");
  const [payload, setPayload] = useState("{}");
  const [totalRequests, setTotalRequests] = useState(100);
  const [concurrency, setConcurrency] = useState(10);
  const [stats, setStats] = useState({ accepted: 0, rejected: 0, errors: 0 });
  const [chartData, setChartData] = useState([]);
  const ws = useRef(null);

  const startTest = async () => {
    try {
      await fetch("http://localhost:8080/start-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, payload, totalRequests, concurrency }),
      });
    } catch (err) {
      console.error("Error starting test:", err);
    }
  };

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8080/ws");

    ws.current.onopen = () => console.log("WebSocket connected");
    ws.current.onclose = () => console.log("WebSocket disconnected");

    ws.current.onmessage = (event) => {
      try {
        const newStats = JSON.parse(event.data);
        setStats((prev) => ({
          accepted: prev.accepted + newStats.accepted,
          rejected: prev.rejected + newStats.rejected,
          errors: prev.errors + newStats.errors,
        }));

        setChartData((prev) => [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            accepted: stats.accepted + newStats.accepted,
            rejected: stats.rejected + newStats.rejected,
            errors: stats.errors + newStats.errors,
          },
        ].slice(-50));
      } catch (err) {
        console.error("Error parsing WS data:", err);
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [stats]);

  const containerStyle = {
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#333",
  };

  const inputStyle = {
    width: "300px",
    padding: "10px",
    marginRight: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
  };

  const buttonStyle = {
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#4caf50",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
    transition: "0.2s all",
  };

  const cardStyle = {
    display: "inline-block",
    width: "150px",
    padding: "15px",
    marginRight: "15px",
    marginBottom: "15px",
    borderRadius: "8px",
    backgroundColor: "#f5f5f5",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    textAlign: "center",
  };

  const headingStyle = { marginBottom: "10px", color: "#222" };

  return (
    <div style={containerStyle}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>API Performance Tester</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="API URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder='Payload JSON'
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="number"
          value={totalRequests}
          onChange={(e) => setTotalRequests(+e.target.value)}
          style={{ ...inputStyle, width: "140px" }}
        />
        <input
          type="number"
          value={concurrency}
          onChange={(e) => setConcurrency(+e.target.value)}
          style={{ ...inputStyle, width: "140px" }}
        />
        <button onClick={startTest} style={buttonStyle}>
          Start Test
        </button>
      </div>

      <h2 style={headingStyle}>Current Stats</h2>
      <div>
        <div style={cardStyle}>
          <h3>Accepted</h3>
          <p style={{ fontSize: "18px", color: "#4caf50" }}>{stats.accepted}</p>
        </div>
        <div style={cardStyle}>
          <h3>Rejected</h3>
          <p style={{ fontSize: "18px", color: "#f44336" }}>{stats.rejected}</p>
        </div>
        <div style={cardStyle}>
          <h3>Errors</h3>
          <p style={{ fontSize: "18px", color: "#ff9800" }}>{stats.errors}</p>
        </div>
      </div>

      <h2 style={{ ...headingStyle, marginTop: "30px" }}>Live Graph</h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="accepted" stroke="#4caf50" dot={false} isAnimationActive />
          <Line type="monotone" dataKey="rejected" stroke="#f44336" dot={false} isAnimationActive />
          <Line type="monotone" dataKey="errors" stroke="#ff9800" dot={false} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default App;
