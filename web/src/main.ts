import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueFire, VueFireAuth } from 'vuefire'

import App from './App.vue'
import router from './router'
import { firebaseApp } from './lib/firebase'

const app = createApp(App)

app.use(createPinia())
app.use(VueFire, { firebaseApp, modules: [VueFireAuth()] })
app.use(router)

app.mount('#app')
