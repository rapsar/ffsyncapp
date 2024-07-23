function displayResults(flashCounts) {
    if (chart) {
        chart.destroy();
    }

    // Determine the appropriate tick interval
    const dataLength = flashCounts.length;
    let tickInterval;
    if (dataLength <= 100) {
        tickInterval = 10;
    } else if (dataLength <= 1000) {
        tickInterval = 100;
    } else {
        tickInterval = Math.ceil(dataLength / 10 / 1000) * 1000;
    }

    const ctx = document.getElementById('flash-chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: dataLength }, (_, i) => i + 1),
            datasets: [{
                data: flashCounts,
                borderColor: '#ffdd44',
                tension: 0.1,
                borderWidth: 1,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Frame Number'
                    },
                    ticks: {
                        stepSize: tickInterval,
                        maxTicksLimit: 11,
                        callback: function(value, index, values) {
                            return Number.isInteger(value) ? value : '';
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Flashes per Frame'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}
