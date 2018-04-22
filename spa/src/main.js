import Vue from 'vue'
import Vuex from "vuex";
import App from './App'
import VueRouter from 'vue-router'

import Login from './components/Login'
import LabelTaskChooser from './components/LabelTaskChooser'
import ImageLabeler from './components/ImageLabeling'

Vue.use(VueRouter)
Vue.use(Vuex)

Vue.config.productionTip = false

const routes = [
  { path: '/', component: Login },
  { path: '/login', component: Login },
  { path: '/label_tasks', component: LabelTaskChooser },
  { path: '/image_labeler', component: ImageLabeler }
]

const router = new VueRouter({
  routes, // short for routes: routes
  mode: 'history'
})

const store = new Vuex.Store({
  state: {
    label_tasks: [],
    selected_label_task_id: -1
  },
  mutations: {
    set_label_tasks (state, label_tasks) {
      state.label_tasks = label_tasks;
    },
    select_label_task (state, idx) {
      state.selected_label_task_id = idx;
    }
  },
  getters: {
    label_task: state => {
      return state.label_tasks.find(label_task => label_task.label_task_id === state.selected_label_task_id)
    }
  }
})

/* eslint-disable no-new */
new Vue({
  el: '#app',           // define the selector for the root component
  template: '<App/>',   // pass the template to the root component
  components: { App },  // declare components that the root component can access
  store,
  router,
  render: h => h(App)
}).$mount('#app')       // mount the router on the app
