<script>  
	import data from "./data/combined_data.json";
	import LineChart from "./LineChart.svelte";
</script>

<main>
	<h1>Energy Consumtion</h1>

	<p>...</p>

	<div class="chart">
		<LineChart {data} />
	</div>
</main>



<style>
	h1 {
		text-align: center;
	}

	p {
		text-align: center;
	}

	.chart {
		text-align: center;
	}
</style>

