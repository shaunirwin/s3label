<template>
    <div class="container">
    </div>
</template>

<script>

import {  mapActions } from "vuex";

export default {
    
  name: "logout",
  created() {
      this.logUserOut();
  },
  methods: {
      ...mapActions('user_login', [
            'logout'
        ]),
    logUserOut: function() {
        this.logout()

        // go to login page

        this.$router.push('login');
    }
  }
};
</script>

<style>
/* #login {
    font-family: "Avenir", Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
} */
</style>
