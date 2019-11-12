<script>
</script>

<style lang="scss">
  @import "./style/global.scss";

  .grid-68 {
    display: grid;
    grid-template-columns: repeat(17, auto [col-start]);
    grid-template-rows: auto, 20%;
    span {
      text-align: center;
      &.letter {
        color: $primary-color;
        opacity: 0.5;
        // TODO: add calc() to get more sensible sizes
        // https://css-tricks.com/fun-viewport-units/#article-header-id-1
        font-size: 3.1875vw;
      }
      &.number {
        font-size: 1.59375vw;
        color: $primary-color;
        opacity: 0.3;
        margin-top: -0.8em;
      }
      &.highlight {
        color: $primary-color;
        opacity: 1;
        font-weight: bold;
      }
    }
  }
</style>

<div class="grid-68">
   <!-- TODO: Drop "O" and "x" ? -->
  <span class="letter highlight">O</span>
  <span class="letter">l</span>
  <span class="letter">i</span>
  <span class="letter">v</span>
  <span class="letter">i</span>
  <span class="letter">e</span>
  <span class="letter">r</span>
  <span class="letter"></span>
  <span class="letter">C</span>
  <span class="letter">a</span>
  <span class="letter">r</span>
  <span class="letter">d</span>
  <span class="letter">i</span>
  <span class="letter">n</span>
  <span class="letter">a</span>
  <span class="letter">u</span>
  <span class="letter highlight">x</span>

  <span class="number"></span>
  <span class="number">1</span>
  <span class="number">2</span>
  <span class="number">3</span>
  <span class="number">4</span>
  <span class="number">5</span>
  <span class="number highlight">6</span>
  <span class="number">&nbsp;</span>
  <span class="number highlight">8</span>
  <span class="number">7</span>
  <span class="number">6</span>
  <span class="number">5</span>
  <span class="number">4</span>
  <span class="number">3</span>
  <span class="number">2</span>
  <span class="number">1</span>
  <span class="number"></span>
</div>
