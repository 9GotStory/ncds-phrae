import { Chart, registerables } from 'chart.js';

// Register Chart.js components once globally
Chart.register(...registerables);

export default Chart;
