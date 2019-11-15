<script>
  import Icon from 'svelte-awesome';
  import { beer, camera } from "svelte-awesome/icons";
</script>

<style lang="scss">
  .navbar {
    background: linear-gradient( rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  }
</style>

<nav class="navbar">
  <section class="navbar-section">
    <!-- <a href="#" class="navbar-brand mr-2">{name}</a> -->
  </section>
  <section class="navbar-center">
    <a class="btn btn-link" href="#projects">projets</a>
    <a class="btn btn-link" href="#cv">cv</a>
    <a class="btn btn-link" href="#lampadaires">lampadaires</a>
  </section>
  <section class="navbar-section">
      <Icon data={beer} />
      <Icon data={camera} />
  </section>
</nav>
