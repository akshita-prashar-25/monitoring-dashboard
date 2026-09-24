import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import "./App.css";

function getLastSeenText(
  lastSeen,
  currentTime
) {

  if (!lastSeen) {
    return "Never";
  }

  const lastSeenTime =
    new Date(lastSeen).getTime();

  const now =
    currentTime || Date.now();

  const difference =
    Math.floor(
      (now - lastSeenTime) / 1000
    );

  if (difference < 0) {
    return "Just now";
  }

  if (difference < 60) {
    return `${difference} seconds ago`;
  }

  const minutes =
    Math.floor(difference / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days =
    Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}


function App() {

  // =========================
  // STATE
  // =========================

  const [servers, setServers] = useState([]);

  const [metrics, setMetrics] = useState({});

  const [allMetrics, setAllMetrics] = useState([]);

  const [alerts, setAlerts] = useState([]);

  const [agents, setAgents] = useState([]);

  const [alertTypeFilter, setAlertTypeFilter] =
  useState("ALL");

const [alertStatusFilter, setAlertStatusFilter] =
  useState("ALL");

const [alertSeverityFilter, setAlertSeverityFilter] =
  useState("ALL");

  const [selectedServerId, setSelectedServerId] =
  useState(
    () =>
      localStorage.getItem(
        "selectedServerId"
      ) || ""
  );

  const [timeRange, setTimeRange] =
    useState("30");

  const [serverName, setServerName] =
    useState("");

  const [serverIp, setServerIp] =
    useState("");

  const [error, setError] =
    useState("");

    const [currentTime, setCurrentTime] =
  useState(Date.now());

  // =========================
  // UPDATE CURRENT TIME
  // =========================

  useEffect(() => {

    const timer =
      setInterval(() => {

        setCurrentTime(
          Date.now()
        );

      }, 1000);

    return () =>
      clearInterval(timer);

  }, []);


  // =========================
  // REFRESH DATA
  // =========================

  useEffect(() => {

    fetchData();

    const interval =
      setInterval(
        fetchData,
        5000
      );

    return () =>
      clearInterval(interval);

  }, []);


  // =========================
  // FETCH DATA
  // =========================

  const fetchData = async () => {

    try {

      setError("");

      const [
        serversResponse,
        metricsResponse,
        alertsResponse,
        agentsResponse
      ] = await Promise.all([

        fetch(
          "http://localhost:8080/api/servers"
        ),

        fetch(
          "http://localhost:8080/api/metrics"
        ),

        fetch(
          "http://localhost:8080/api/alerts"
        ),

        fetch(
          "http://localhost:8080/api/agents"
        )

]);


      if (
        !serversResponse.ok ||
        !metricsResponse.ok ||
        !alertsResponse.ok ||
        !agentsResponse.ok
      ) {

        throw new Error(
          "Failed to fetch monitoring data"
        );

}


      const serversData =
        await serversResponse.json();

      const metricsData =
        await metricsResponse.json();

      const alertsData =
        await alertsResponse.json();

      const agentsData =
        await agentsResponse.json();


      setServers(serversData);

      setAllMetrics(metricsData);

      setAlerts(alertsData);

      setAgents(agentsData);


      // =========================
      // FIND LATEST METRIC
      // FOR EACH SERVER
      // =========================

      const latestMetrics = {};


      metricsData.forEach((metric) => {

        const existing =
          latestMetrics[metric.serverId];


        if (
          !existing ||
          new Date(metric.timestamp) >
            new Date(existing.timestamp)
        ) {

          latestMetrics[metric.serverId] =
            metric;

        }

      });


      setMetrics(latestMetrics);




    } catch (error) {

      console.error(
        "Fetch error:",
        error
      );

      setError(
        "Unable to connect to the monitoring backend."
      );

    }

  };


  // =========================
  // KEEP SELECTED SERVER
  // =========================

  useEffect(() => {

    if (servers.length === 0) {
      return;
    }


    // Select the first server only when
    // no server is currently selected.

    if (!selectedServerId) {

      setSelectedServerId(
        String(servers[0].id)
      );

      return;
    }


    // Check whether the selected server
    // still exists.

    const selectedServerExists =
      servers.some(
        (server) =>
          server.id ===
          Number(selectedServerId)
      );


    // If the selected server was deleted,
    // select the first available server.

    if (!selectedServerExists) {

      setSelectedServerId(
        String(servers[0].id)
      );

    }

  }, [
    servers,
    selectedServerId
  ]);
  useEffect(() => {

  if (selectedServerId) {

    localStorage.setItem(
      "selectedServerId",
      selectedServerId
    );

  }

}, [
  selectedServerId
]);


  // =========================
  // ADD SERVER
  // =========================

  const addServer = async (event) => {

    event.preventDefault();


    if (
      !serverName.trim() ||
      !serverIp.trim()
    ) {

      setError(
        "Please enter both server name and IP address."
      );

      return;

    }


    try {

      setError("");


      const response =
        await fetch(
          "http://localhost:8080/api/servers",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              name:
                serverName.trim(),

              ipAddress:
                serverIp.trim(),

              status:
                "DOWN"

            })

          }
        );


      if (!response.ok) {

        throw new Error(
          "Failed to add server"
        );

      }


      const newServer =
        await response.json();


      setServerName("");

      setServerIp("");


      await fetchData();


      // Select newly created server
      if (newServer?.id) {

        setSelectedServerId(
          String(newServer.id)
        );

      }


    } catch (error) {

      console.error(
        "Add server error:",
        error
      );

      setError(
        "Unable to add server."
      );

    }

  };


  // =========================
  // DELETE SERVER
  // =========================

  const deleteServer = async (
    serverId
  ) => {

    try {

      setError("");


      const response =
        await fetch(
          `http://localhost:8080/api/servers/${serverId}`,
          {
            method: "DELETE"
          }
        );


      if (!response.ok) {

        throw new Error(
          "Failed to delete server"
        );

      }


      if (
        selectedServerId ===
        String(serverId)
      ) {

        setSelectedServerId("");

      }


      await fetchData();


    } catch (error) {

      console.error(
        "Delete server error:",
        error
      );

      setError(
        "Unable to delete server."
      );

    }

  };

 // =========================
// UPDATE AGENT STATUS
// =========================

const updateAgentStatus = async (
  agentId,
  status
) => {

  try {

    setError("");


    const response =
      await fetch(
        `http://localhost:8080/api/agents/${agentId}/status`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify(
            status
          )
        }
      );


    if (!response.ok) {

      throw new Error(
        "Failed to update agent status"
      );

    }


    await fetchData();


  } catch (error) {

    console.error(
      "Agent status error:",
      error
    );

    setError(
      "Unable to update agent status."
    );

  }

};

// =========================
// FILTER ALERTS
// =========================

const filteredAlerts =
  alerts.filter((alert) => {

    const typeMatches =
      alertTypeFilter === "ALL" ||
      alert.type === alertTypeFilter;

    const statusMatches =
      alertStatusFilter === "ALL" ||
      alert.status === alertStatusFilter;

    const severityMatches =
      alertSeverityFilter === "ALL" ||
      alert.severity === alertSeverityFilter;

    return (
      typeMatches &&
      statusMatches &&
      severityMatches
    );
  });


// =========================
// ACTIVE ALERTS
// =========================

const activeAlerts =
  filteredAlerts.filter(
    (alert) =>
      alert.status === "ACTIVE"
  );


// =========================
// RESOLVED ALERTS
// =========================

const resolvedAlerts =
  filteredAlerts.filter(
    (alert) =>
      alert.status === "RESOLVED"
  );


  // =========================
// ONLINE SERVERS
// =========================

const onlineServers =
  servers.filter(
    (server) =>
      server.status === "UP"
  );

  // =========================
// AGENT STATUS
// =========================

const onlineAgents =
  agents.filter(
    (agent) =>
      agent.connectionStatus ===
      "ONLINE"
  );

const offlineAgents =
  agents.filter(
    (agent) =>
      agent.connectionStatus ===
      "OFFLINE"
  );


  // =========================
  // CRITICAL ALERTS
  // =========================

  const criticalAlerts =
    activeAlerts.filter(
      (alert) =>
        alert.severity ===
        "CRITICAL"
    );


  // =========================
  // SERVERS WITH METRICS
  // =========================

  const serversWithMetrics =
    onlineServers.filter(
      (server) =>
        metrics[server.id]
    );


  // =========================
  // AVERAGE CPU
  // =========================

  const averageCpu =
    serversWithMetrics.length > 0
      ? (
          serversWithMetrics.reduce(
            (sum, server) =>
              sum +
              (
                Number(
                  metrics[server.id]
                    .cpuUsage
                ) || 0
              ),
            0
          ) /
          serversWithMetrics.length
        ).toFixed(1)
      : 0;


  // =========================
// AVERAGE MEMORY
// =========================

const averageMemory =
  serversWithMetrics.length > 0
    ? (
        serversWithMetrics.reduce(
          (sum, server) =>
            sum +
            (
              Number(
                metrics[server.id]
                  .memoryUsage
              ) || 0
            ),
          0
        ) /
        serversWithMetrics.length
      ).toFixed(1)
    : 0;


  // =========================
  // GET SERVER NAME
  // =========================

  const getServerName = (
    serverId
  ) => {

    const server =
      servers.find(
        (server) =>
          server.id ===
          serverId
      );


    return server
      ? server.name
      : `Server ${serverId}`;

  };

// =========================
// GET AGENT NAME
// =========================

const getAgentName = (agentId) => {

  if (!agentId) {
    return null;
  }

  const agent =
    agents.find(
      (agent) =>
        agent.id === agentId
    );

  return agent
    ? agent.agentName
    : `Agent ${agentId}`;
};

  // =========================
  // RESOURCE STATUS
  // =========================

  const getResourceStatus = (value) => {

    if (
      value === null ||
      value === undefined
    ) {
      return "NORMAL";
    }

    if (value > 90) {
      return "CRITICAL";
    }

    if (value > 80) {
      return "WARNING";
    }

    return "NORMAL";
  };


  // =========================
  // FORMAT UPTIME
  // =========================

  const formatUptime = (
    seconds
  ) => {

    if (
      seconds === null ||
      seconds === undefined
    ) {

      return "N/A";

    }


    const days =
      Math.floor(
        seconds / 86400
      );


    const hours =
      Math.floor(
        (seconds % 86400) /
        3600
      );


    const minutes =
      Math.floor(
        (seconds % 3600) /
        60
      );


    if (days > 0) {

      return `${days}d ${hours}h ${minutes}m`;

    }


    if (hours > 0) {

      return `${hours}h ${minutes}m`;

    }


    return `${minutes}m`;

  };


  // =========================
  // FORMAT NETWORK SPEED
  // =========================

  const formatSpeed = (
    bytesPerSecond
  ) => {

    if (
      bytesPerSecond === null ||
      bytesPerSecond === undefined
    ) {

      return "0 KB/s";

    }


    const kb =
      bytesPerSecond / 1024;


    if (kb >= 1024) {

      return `${(
        kb / 1024
      ).toFixed(2)} MB/s`;

    }


    return `${kb.toFixed(2)} KB/s`;

  };


  // =========================
  // HISTORY DATA
  // =========================

  const historyData =
    useMemo(() => {

      if (!selectedServerId) {

        return [];

      }


      const now =
        new Date();


      const startTime =
        new Date(

          now.getTime() -

          Number(timeRange) *
          60 *
          1000

        );


      return allMetrics

        .filter(
          (metric) => {

            const metricTime =
              new Date(
                metric.timestamp
              );


            return (

              metric.serverId ===
                Number(
                  selectedServerId
                ) &&

              metricTime >=
                startTime &&

              metricTime <=
                now

            );

          }
        )

        .sort(
          (a, b) =>

            new Date(
              a.timestamp
            ) -

            new Date(
              b.timestamp
            )
        )

        .map(
          (metric) => ({

            time:
              new Date(
                metric.timestamp
              ).toLocaleTimeString(),

            cpu:
              metric.cpuUsage,

            memory:
              metric.memoryUsage,

            disk:
              metric.diskUsage,

            upload:

              metric.uploadSpeed !==
                null &&

              metric.uploadSpeed !==
                undefined

                ? metric.uploadSpeed /
                  1024

                : 0,

            download:

              metric.downloadSpeed !==
                null &&

              metric.downloadSpeed !==
                undefined

                ? metric.downloadSpeed /
                  1024

                : 0

          })
        );

    }, [

      allMetrics,

      selectedServerId,

      timeRange

    ]);


  // =========================
  // SELECTED SERVER
  // =========================

  const selectedServer =
    servers.find(
      (server) =>
        server.id ===
        Number(
          selectedServerId
        )
    );



  // =========================
  // UI
  // =========================

  return (

    <div className="app">


      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <header className="header">

        <div>

          <h1>
            Cloud Infrastructure
            Monitoring
          </h1>

          <p>
            Monitor servers, system
            resources and alerts
            in real time.
          </p>

        </div>

      </header>


      {/* ========================= */}
      {/* ERROR */}
      {/* ========================= */}

      {error && (

        <div className="error-message">

          {error}

        </div>

      )}


      {/* ========================= */}
      {/* SUMMARY */}
      {/* ========================= */}

      <section className="summary">

        <div className="summary-card">
          <h3>Total Servers</h3>
          <p>{servers.length}</p>
        </div>

        <div className="summary-card">
          <h3>Online Servers</h3>
          <p>{onlineServers.length}</p>
        </div>

        <div className="summary-card">
          <h3>Total Agents</h3>
          <p>{agents.length}</p>
        </div>

        <div className="summary-card">
          <h3>Online Agents</h3>
          <p>{onlineAgents.length}</p>
        </div>

        <div className="summary-card">
          <h3>Active Alerts</h3>
          <p>{activeAlerts.length}</p>
        </div>

        <div className="summary-card">
          <h3>Critical Alerts</h3>
          <p>{criticalAlerts.length}</p>
        </div>

      </section>


      {/* ========================= */}
      {/* SYSTEM OVERVIEW */}
      {/* ========================= */}

      <section className="section">

        <div className="section-heading">

          <div>
            <h2>System Overview</h2>
            <p>
              Average resource usage across
              online servers.
            </p>
          </div>

        </div>

        <div className="overview-grid">

          <div className="overview-card">
            <span>Average CPU</span>
            <strong>{averageCpu}%</strong>
          </div>

          <div className="overview-card">
            <span>Average Memory</span>
            <strong>{averageMemory}%</strong>
          </div>

          <div className="overview-card">
            <span>Offline Agents</span>
            <strong>{offlineAgents.length}</strong>
          </div>

        </div>

      </section>


      {/* ========================= */}
      {/* SERVER MONITORING */}
      {/* ========================= */}

      <section className="section">


        <div className="section-heading">

          <div>

            <h2>
              Server Monitoring
            </h2>

            <p>
              Current system performance
              of monitored servers.
            </p>

          </div>

        </div>


        <div className="server-grid">


          {servers.length === 0 ? (

            <div className="history-message">

              No servers registered.

            </div>

          ) : (

            servers.map(
              (server) => {

                const metric =
                  metrics[
                    server.id
                  ];

                const serverAgent =
                  agents.find(
                    (agent) =>
                      agent.serverId ===
                      server.id
                  );

                const isOnline =
                  server.status ===
                  "UP";


                return (

                  <div
                    className="server-card"
                    key={server.id}
                  >


                    {/* SERVER HEADER */}

                    <div className="server-header">

                      <div>

                        <h3>
                          {server.name}
                        </h3>

                        <p>
                          {server.ipAddress}
                        </p>

                      </div>


                      <span
                        className={
                          isOnline
                            ? "server-status up"
                            : "server-status down"
                        }
                      >

                        ●{" "}

                        {isOnline
                          ? "UP"
                          : "DOWN"}

                      </span>

                    </div>


                    {/* MONITORING AGENT HEALTH */}

                    <div className="server-agent-status">

                      <span className="agent-label">
                        Monitoring Agent
                      </span>

                      {serverAgent ? (

                        <>

                          <span
                            className={`connection-badge ${
                              serverAgent.connectionStatus ===
                              "ONLINE"
                                ? "online"
                                : "offline"
                            }`}
                          >
                            ●{" "}
                            {serverAgent.connectionStatus}
                          </span>

                          <span
                            className={`agent-admin-status ${
                              serverAgent.status ===
                              "ACTIVE"
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {serverAgent.status}
                          </span>

                          <span className="agent-last-seen">
                            Last seen:{" "}
                            {getLastSeenText(
                              serverAgent.lastSeen,
                              currentTime
                            )}
                          </span>

                        </>

                      ) : (

                        <span className="agent-not-found">
                          No Agent
                        </span>

                      )}

                    </div>


                    {!metric ? (

                      <div className="no-metric">

                        Waiting for
                        monitoring data...

                      </div>

                    ) : (

                      <>

                        <div className="metric-grid">

                          <div className="metric">
                            <span>CPU Usage</span>
                            <strong>
                              {metric.cpuUsage?.toFixed(2)}%
                            </strong>
                          </div>

                          <div className="metric">
                            <span>Memory Usage</span>
                            <strong>
                              {metric.memoryUsage?.toFixed(2)}%
                            </strong>
                          </div>

                          <div className="metric">
                            <span>Disk Usage</span>
                            <strong>
                              {metric.diskUsage?.toFixed(2)}%
                            </strong>
                          </div>

                          <div className="metric">
                            <span>Upload</span>
                            <strong>
                              {formatSpeed(metric.uploadSpeed)}
                            </strong>
                          </div>

                          <div className="metric">
                            <span>Download</span>
                            <strong>
                              {formatSpeed(metric.downloadSpeed)}
                            </strong>
                          </div>

                          <div className="metric">
                            <span>Uptime</span>
                            <strong>
                              {formatUptime(metric.uptimeSeconds)}
                            </strong>
                          </div>

                        </div>


                        {/* ========================= */}
                        {/* RESOURCE HEALTH */}
                        {/* ========================= */}

                        <div className="resource-health">

                          <div className="resource-health-item">
                            <span>CPU</span>
                            <span
                              className={`resource-status ${getResourceStatus(
                                metric.cpuUsage
                              ).toLowerCase()}`}
                            >
                              {getResourceStatus(metric.cpuUsage)}
                            </span>
                          </div>

                          <div className="resource-health-item">
                            <span>Memory</span>
                            <span
                              className={`resource-status ${getResourceStatus(
                                metric.memoryUsage
                              ).toLowerCase()}`}
                            >
                              {getResourceStatus(metric.memoryUsage)}
                            </span>
                          </div>

                          <div className="resource-health-item">
                            <span>Disk</span>
                            <span
                              className={`resource-status ${getResourceStatus(
                                metric.diskUsage
                              ).toLowerCase()}`}
                            >
                              {getResourceStatus(metric.diskUsage)}
                            </span>
                          </div>

                        </div>

                      </>

                    )}

                  </div>

                );

              }
            )

          )}

        </div>

      </section>


      {/* ========================= */}
      {/* SERVER MANAGEMENT */}
      {/* ========================= */}

      <section className="section">


        <div className="section-heading">

          <div>

            <h2>
              Server Management
            </h2>

            <p>
              Add or remove monitored
              servers.
            </p>

          </div>

        </div>


        {/* ADD SERVER */}

        <form
          className="server-form"
          onSubmit={addServer}
        >


          <div className="form-group">

            <label htmlFor="server-name">

              Server Name

            </label>


            <input
              id="server-name"
              type="text"
              placeholder="e.g. Server 3"
              value={serverName}
              onChange={
                (event) =>
                  setServerName(
                    event.target.value
                  )
              }
            />

          </div>


          <div className="form-group">

            <label htmlFor="server-ip">

              IP Address

            </label>


            <input
              id="server-ip"
              type="text"
              placeholder="e.g. 192.168.1.20"
              value={serverIp}
              onChange={
                (event) =>
                  setServerIp(
                    event.target.value
                  )
              }
            />

          </div>


          <button
            type="submit"
            className="add-server-button"
          >

            Add Server

          </button>


        </form>


        {/* SERVER LIST */}

        <div className="managed-servers">


          {servers.map(
            (server) => (

              <div
                className="managed-server"
                key={server.id}
              >


                <div>

                  <strong>
                    {server.name}
                  </strong>

                  <span>
                    {server.ipAddress}
                  </span>

                </div>


                <div className="managed-server-actions">


                  <span
                    className={
                      server.status ===
                      "UP"

                        ? "server-status up"

                        : "server-status down"
                    }
                  >

                    ●{" "}

                    {server.status}

                  </span>


                  <button
                    type="button"
                    className="delete-server-button"
                    onClick={() =>
                      deleteServer(
                        server.id
                      )
                    }
                  >

                    Delete

                  </button>


                </div>


              </div>

            )
          )}

        </div>


      </section>

{/* ========================= */}
{/* AGENT MANAGEMENT */}
{/* ========================= */}

<section className="section">

  <div className="section-heading">

    <div>

      <h2>
        Agent Management
      </h2>

      <p>
        Manage registered monitoring agents.
      </p>

    </div>

    <span className="agent-count">
      {agents.length}
    </span>

  </div>


  {agents.length === 0 ? (

    <div className="history-message">

      No monitoring agents registered.

    </div>

  ) : (

    <div className="agents-list">

      {agents.map(
        (agent) => (

          <div
            className="agent-card"
            key={agent.id}
          >

            {/* AGENT INFORMATION */}

            <div className="agent-info">

              <div className="agent-title">

                <strong>
                  {agent.agentName}
                </strong>

                <span
                  className={
                    agent.status === "ACTIVE"
                      ? "agent-status active"
                      : "agent-status inactive"
                  }
                >
                  ● {agent.status}
                </span>

              </div>


              <div className="agent-details">

                <span>
                  Agent ID: {agent.id}
                </span>

                <span>
                  Server:{" "}
                  {getServerName(
                    agent.serverId
                  )}
                </span>

                <span>
                  Hostname:{" "}
                  {agent.hostname}
                </span>

                <span>
                  IP:{" "}
                  {agent.ipAddress}
                </span>

                <span>
                  Registered:{" "}
                  {new Date(
                    agent.registeredAt
                  ).toLocaleString()}
                </span>

                <span>
                  Last seen: {
                    getLastSeenText(
                      agent.lastSeen,
                      currentTime
                    )
                  }
                </span>

              </div>

            </div>


            {/* ACTION */}

            <div className="agent-actions">

              {agent.status === "ACTIVE" ? (

                <button
                  type="button"
                  className="deactivate-agent-button"
                  onClick={() =>
                    updateAgentStatus(
                      agent.id,
                      "INACTIVE"
                    )
                  }
                >
                  Deactivate
                </button>

              ) : (

                <button
                  type="button"
                  className="activate-agent-button"
                  onClick={() =>
                    updateAgentStatus(
                      agent.id,
                      "ACTIVE"
                    )
                  }
                >
                  Activate
                </button>

              )}

            </div>

          </div>

        )
      )}

    </div>

  )}

</section>


      {/* ========================= */}
      {/* MONITORING HISTORY */}
      {/* ========================= */}

      <section className="section">


        <div className="section-heading">

          <div>

            <h2>
              Monitoring History
            </h2>

            <p>
              Historical system performance
              for the selected server.
            </p>

          </div>


          <div className="history-controls">


            <div className="control-group">

              <label>
                Server
              </label>

              <select
                value={selectedServerId}
                onChange={
                  (event) =>
                    setSelectedServerId(
                      event.target.value
                    )
                }
              >

                <option value="">

                  Select Server

                </option>


                {servers.map(
                  (server) => (

                    <option
                      key={server.id}
                      value={server.id}
                    >

                      {server.name}

                    </option>

                  )
                )}

              </select>

            </div>


            <div className="control-group">

              <label>
                Time Range
              </label>

              <select
                value={timeRange}
                onChange={
                  (event) =>
                    setTimeRange(
                      event.target.value
                    )
                }
              >

                <option value="30">
                  Last 30 minutes
                </option>

                <option value="60">
                  Last 1 hour
                </option>

                <option value="360">
                  Last 6 hours
                </option>

                <option value="1440">
                  Last 24 hours
                </option>

              </select>

            </div>


          </div>

        </div>


        <div className="history-info">

          {selectedServer && (

            <span>

              Showing history for{" "}

              <strong>
                {selectedServer.name}
              </strong>

            </span>

          )}


          <span>

            Readings:{" "}

            <strong>
              {historyData.length}
            </strong>

          </span>

        </div>


        {!selectedServerId ? (

          <div className="history-message">

            Please select a server.

          </div>

        ) : historyData.length === 0 ? (

          <div className="history-message">

            No monitoring data available
            for the selected time range.

          </div>

        ) : (

          <div className="charts">


            {/* CPU */}

            <div className="chart-card">

              <div className="chart-header">

                <h3>
                  CPU Usage
                </h3>

                <span>
                  Percentage
                </span>

              </div>


              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <LineChart
                  data={historyData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="time"
                  />

                  <YAxis
                    domain={[
                      0,
                      100
                    ]}
                  />

                  <Tooltip
                    formatter={
                      (value) =>
                        [
                          `${Number(
                            value
                          ).toFixed(2)}%`,
                          "CPU"
                        ]
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="cpu"
                    strokeWidth={2}
                    dot={false}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>


            {/* MEMORY */}

            <div className="chart-card">

              <div className="chart-header">

                <h3>
                  Memory Usage
                </h3>

                <span>
                  Percentage
                </span>

              </div>


              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <LineChart
                  data={historyData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="time"
                  />

                  <YAxis
                    domain={[
                      0,
                      100
                    ]}
                  />

                  <Tooltip
                    formatter={
                      (value) =>
                        [
                          `${Number(
                            value
                          ).toFixed(2)}%`,
                          "Memory"
                        ]
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="memory"
                    strokeWidth={2}
                    dot={false}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>


            {/* DISK */}

            <div className="chart-card">

              <div className="chart-header">

                <h3>
                  Disk Usage
                </h3>

                <span>
                  Percentage
                </span>

              </div>


              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <LineChart
                  data={historyData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="time"
                  />

                  <YAxis
                    domain={[
                      0,
                      100
                    ]}
                  />

                  <Tooltip
                    formatter={
                      (value) =>
                        [
                          `${Number(
                            value
                          ).toFixed(2)}%`,
                          "Disk"
                        ]
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="disk"
                    strokeWidth={2}
                    dot={false}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>


            {/* NETWORK */}

            <div className="chart-card">

              <div className="chart-header">

                <h3>
                  Network Speed
                </h3>

                <span>
                  KB/s
                </span>

              </div>


              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <LineChart
                  data={historyData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="time"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={
                      (value, name) => [

                        `${Number(
                          value
                        ).toFixed(2)} KB/s`,

                        name === "upload"
                          ? "Upload"
                          : "Download"

                      ]
                    }
                  />


                  <Line
                    type="monotone"
                    dataKey="upload"
                    strokeWidth={2}
                    dot={false}
                  />


                  <Line
                    type="monotone"
                    dataKey="download"
                    strokeWidth={2}
                    dot={false}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>


          </div>

        )}

      </section>


      {/* ========================= */}
      {/* ACTIVE ALERTS */}
      {/* ========================= */}

      <section className="section">


        <div className="section-heading">

          <div>

            <h2>
              Alerts
            </h2>

          <p>
            Monitor active and resolved
            system alerts.
          </p> 

          </div>

          <span className="alert-count">
            {filteredAlerts.length}
          </span>

          </div>


{/* ========================= */}
{/* ALERT FILTERS */}
{/* ========================= */}

<div className="alert-filters">

  <div className="control-group">

    <label>
      Type
    </label>

    <select
      value={alertTypeFilter}
      onChange={(event) =>
        setAlertTypeFilter(
          event.target.value
        )
      }
    >

      <option value="ALL">
        All Types
      </option>

      <option value="CPU">
        CPU
      </option>

      <option value="MEMORY">
        Memory
      </option>

      <option value="DISK">
        Disk
      </option>

      <option value="AGENT">
        Agent
      </option>

    </select>

  </div>


  <div className="control-group">

    <label>
      Status
    </label>

    <select
      value={alertStatusFilter}
      onChange={(event) =>
        setAlertStatusFilter(
          event.target.value
        )
      }
    >

      <option value="ALL">
        All Status
      </option>

      <option value="ACTIVE">
        Active
      </option>

      <option value="RESOLVED">
        Resolved
      </option>

    </select>

  </div>


  <div className="control-group">

    <label>
      Severity
    </label>

    <select
      value={alertSeverityFilter}
      onChange={(event) =>
        setAlertSeverityFilter(
          event.target.value
        )
      }
    >

      <option value="ALL">
        All Severity
      </option>

      <option value="HIGH">
        High
      </option>

      <option value="CRITICAL">
        Critical
      </option>

    </select>

  </div>


  <button
    type="button"
    className="clear-alert-filters"
    onClick={() => {

      setAlertTypeFilter("ALL");

      setAlertStatusFilter("ALL");

      setAlertSeverityFilter("ALL");

    }}
  >
    Clear Filters
  </button>

</div>


        {activeAlerts.length === 0 ? (

          <div className="no-active-alerts">

            <span className="success-icon">
              ✓
            </span>

            <div>

              <strong>
                No alerts found
              </strong>

              <p>
                No alerts match the selected
                filters.
              </p>

            </div>

          </div>

        ) : (

          <div className="alerts-list">

            {activeAlerts.map(
              (alert) => (

                <div
                  className="alert-card active"
                  key={alert.id}
                >

                  <div className="alert-title">

                    <strong>
                      {alert.type}
                    </strong>

                    <span
                      className={`severity ${alert.severity.toLowerCase()}`}
                    >

                      {alert.severity}

                    </span>

                  </div>


                  <div className="alert-server">

                    {getServerName(
                      alert.serverId
                    )}

                    {alert.agentId && (
                      <span className="alert-agent">
                        Agent: {getAgentName(
                          alert.agentId
                        )}
                      </span>
                    )}

                  </div>


                  <p>
                    {alert.message}
                  </p>


                  <div className="alert-footer">

                    <span>
                      {new Date(
                        alert.timestamp
                      ).toLocaleString()}
                    </span>

                    <span className="alert-status">

                      {alert.status}

                    </span>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>


      {/* ========================= */}
      {/* ALERT HISTORY */}
      {/* ========================= */}

      <section className="section">


        <div className="section-heading">

          <div>

            <h2>
              Alert History
            </h2>

            <p>
              Previously triggered and
              resolved alerts.
            </p>

          </div>


          <span className="history-count">

            {resolvedAlerts.length}

          </span>

        </div>


        {resolvedAlerts.length === 0 ? (

          <div className="history-message">

            No resolved alerts yet.

          </div>

        ) : (

          <div className="alerts-list">

            {resolvedAlerts.map(
              (alert) => (

                <div
                  className="alert-card resolved"
                  key={alert.id}
                >

                  <div className="alert-title">

                    <strong>
                      {alert.type}
                    </strong>

                    <span
                      className={`severity ${alert.severity.toLowerCase()}`}
                    >

                      {alert.severity}

                    </span>

                  </div>


                  <div className="alert-server">

                    {getServerName(
                      alert.serverId
                    )}
                    {alert.agentId && (
                      <span className="alert-agent">
                        Agent: {getAgentName(
                          alert.agentId
                        )}
                      </span>
                    )}

                  </div>


                  <p>
                    {alert.message}
                  </p>


                  <div className="alert-footer">

                    <span>
                      {new Date(
                        alert.timestamp
                      ).toLocaleString()}
                    </span>

                    <span className="alert-status">

                      RESOLVED

                    </span>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>


      {/* ========================= */}
      {/* FOOTER */}
      {/* ========================= */}

      <footer className="footer">

        <p>

          Cloud Infrastructure
          Monitoring & Alerting Platform

        </p>

        <span>
          Backend: Spring Boot •
          Database: MySQL •
          Agent: Python
        </span>

      </footer>


    </div>

  );

}


export default App;