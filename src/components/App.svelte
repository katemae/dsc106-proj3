<script>  
	import data from "./data/combined_data.json";
	import LineChart from "./LineChart.svelte";
</script>

<main>
	<h1>Energy Consumption</h1>

	<p>...</p>

	<div class="chart">
		<LineChart {data} />
	</div>
</main>



<style>
	@import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,500;1,500&display=swap');
	h1 {
		text-align: center;
		font-family: "Open Sans";
	}

	p {
		text-align: center;
	}

	.chart {
		text-align: center;
	}
</style>

