<script>
  import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
  let visible = false;

  onMount(() => {
    visible = true;
  });
</script>

<style lang="scss">
  .blob {
  @import "./style/global.scss";
    position: fixed;
    bottom: 10vw;
    right: 10vh;
    //opacity: 33%;
    fill: rgba($primary-color-light, 0.2);
    width: 25vmax;
    z-index: -1;
  }
</style>

{#if visible}
  <div class="blob" in:fade="{{ delay:2000, duration: 3000 }}">
    <svg version="1.1"
      viewbox="0 0 512 640"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="Filtershadow" height="120%" width="120%">
          <feGaussianBlur stdDeviation="5"/>
        </filter>
      </defs>
      <path
        d="M119 260c-67,-35 -117,1 -118,-38 -1,-24 55,-28 94,3 27,22 75,10 56,-41 -20,-53 22,-41 38,-31 18,10 61,24 37,-45 -28,-82 28,-150 44,-78 8,35 -55,38 -16,109 7,12 43,4 58,-26 46,-91 86,-39 23,11 -38,30 3,58 43,43 13,-5 55,-9 15,27 -49,45 -18,68 55,47 39,-11 96,14 38,43 -46,23 -73,-51 -113,16 -6,10 91,31 20,74 -12,7 -34,-8 -36,-17 -3,-24 -38,-9 -17,51 9,27 94,80 28,104 -23,8 -44,-38 -45,-66 -2,-66 -63,-70 -46,-16 7,22 -23,-3 -26,-6 -14,-14 -28,-2 -15,30 16,39 -77,28 -30,-17 16,-15 16,-43 -22,-45 -25,-1 -34,-63 -49,-7 -10,38 -23,55 -71,52 -33,-2 -67,-31 13,-46 19,-4 59,-27 47,-46 -18,-26 -72,-31 -13,-50 20,-6 18,-28 6,-35z" filter="url(#Filtershadow)"
      />
    </svg>
  </div>
{/if}
