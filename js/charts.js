async function fetchFactoryDefects() {
  try {
      const response = await fetch("http://localhost:3000/queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
    dbName: "submittedDB",
    collectionName: "kensaDB",
    aggregation: [
        {
            $match: {
                Date: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0], 
                    $lte: new Date().toISOString().split("T")[0]
                }
            }
        },
        {
            $group: {
                _id: { $ifNull: ["$工場", "Unknown"] },
                totalNG: { $sum: "$Total_NG" },
                totalProcessQuantity: { $sum: "$Process_Quantity" },
                counter1: { $sum: "$Counters.counter-1" },
                counter2: { $sum: "$Counters.counter-2" },
                counter3: { $sum: "$Counters.counter-3" },
                counter4: { $sum: "$Counters.counter-4" },
                counter5: { $sum: "$Counters.counter-5" },
                counter6: { $sum: "$Counters.counter-6" },
                counter7: { $sum: "$Counters.counter-7" },
                counter8: { $sum: "$Counters.counter-8" },
                counter9: { $sum: "$Counters.counter-9" },
                counter10: { $sum: "$Counters.counter-10" },
                counter11: { $sum: "$Counters.counter-11" },
                counter12: { $sum: "$Counters.counter-12" }
            }
        },
        {
            $project: {
                factory: "$_id",
                totalNG: 1,
                totalProcessQuantity: 1,
                defectPercentage: {
                    $multiply: [{ $divide: ["$totalNG", "$totalProcessQuantity"] }, 100]
                },
                counter1: 1,
                counter2: 1,
                counter3: 1,
                counter4: 1,
                counter5: 1,
                counter6: 1,
                counter7: 1,
                counter8: 1,
                counter9: 1,
                counter10: 1,
                counter11: 1,
                counter12: 1
            }
        }
    ]
})
      });

      const data = await response.json();

      console.log("Fetched Data Sample:", data.slice(0, 10));

      if (!Array.isArray(data) || data.length === 0) {
          console.warn("No valid data received for chart.");
          return;
      }

      const factoryNames = data.map(entry => entry?.factory ?? "Unknown");
      const defectRates = data.map(entry => 
        entry?.defectPercentage ? parseFloat(entry.defectPercentage.toFixed(2)) : 0
      );

      renderAnalyticsCharts(factoryNames, defectRates, data);

  } catch (error) {
      console.error("Error fetching data:", error);
  }
}

function renderAnalyticsCharts(factoryNames, defectRates, data) {
  const chartContainer1 = document.getElementById("analyticsChart1");
  const chartContainer2 = document.getElementById("analyticsChart2");

  if (!chartContainer1 || !chartContainer2) {
      console.error("Chart containers not found!");
      return;
  }

  // Initialize both charts
  const analyticsChart1 = echarts.init(chartContainer1);
  const analyticsChart2 = echarts.init(chartContainer2);

  // --- Graph 1: Total Process Quantity vs Defect Rate ---
  const options1 = {
      title: {
          text: "Total Process Quantity vs Defect Rate",
          left: "center",
          top: "3%",
          textStyle: { fontSize: 18, fontWeight: "bold" }
      },
      tooltip: { trigger: "axis" },
      legend: {
          data: ["Total Process Quantity", "Defect Rate (%)"],
          top: "8%",
          left: "center"
      },
      grid: {
          top: "20%",
          left: "5%",
          right: "5%",
          bottom: "10%",
          containLabel: true
      },
      xAxis: {
          type: "category",
          data: factoryNames,
          axisLabel: { rotate: 25 }
      },
      yAxis: [
          {
              type: "value",
              name: "Total Process Quantity",
              axisLabel: { formatter: "{value}" }
          },
          {
              type: "value",
              name: "Defect Rate (%)",
              min: 0,
              max: 100, // Scale 0-100% for defect rate
              axisLabel: { formatter: "{value} %" }
          }
      ],
      series: [
          {
              name: "Total Process Quantity",
              type: "bar",
              data: data.map(entry => entry.totalProcessQuantity),
              color: "#B0BEC5",
              barWidth: "50%"
          },
          {
              name: "Defect Rate (%)",
              type: "line",
              yAxisIndex: 1,
              data: data.map(entry => parseFloat(entry.defectPercentage.toFixed(2))),
              color: "#0EA5E9",
              lineStyle: { width: 2 },
              symbolSize: 6
          }
      ]
  };

  analyticsChart1.setOption(options1);

  // --- Graph 2: Counter 1-12 per Factory (Side by Side) ---
  const counterNames = Array.from({ length: 12 }, (_, i) => `Counter ${i + 1}`);

  const counterSeries = counterNames.map((counter, i) => ({
      name: counter,
      type: "bar",
      data: data.map(entry => entry[`counter${i + 1}`] ?? 0), // Each factory's counter value
      color: `hsl(${(i * 30) % 360}, 70%, 50%)`, // Unique color for each counter
      barGap: "5%", // Space between bars
      barWidth: 15 // Adjust bar width for visibility
  }));

  const options2 = {
      title: {
          text: "Counters by Factory",
          left: "center",
          top: "3%",
          textStyle: { fontSize: 18, fontWeight: "bold" }
      },
      tooltip: { trigger: "axis" },
      legend: {
          data: counterNames, // Counter 1-12 as legend
          top: "8%",
          left: "center",
          itemWidth: 10, // Reduce legend size
          itemHeight: 10
      },
      grid: {
          top: "20%",
          left: "5%",
          right: "5%",
          bottom: "10%",
          containLabel: true
      },
      xAxis: {
          type: "category",
          data: factoryNames, // Factory names as X-axis
          axisLabel: { rotate: 25 }
      },
      yAxis: {
          type: "value",
          name: "Counter Values",
          axisLabel: { formatter: "{value}" }
      },
      series: counterSeries // Each counter is displayed separately
  };

  analyticsChart2.setOption(options2);

  window.addEventListener("resize", () => {
      analyticsChart1.resize();
      analyticsChart2.resize();
  });
}