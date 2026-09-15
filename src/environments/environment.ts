// src/environments/environment.ts
export const environment = {
    production: false,
<<<<<<< HEAD
    apiUrl: 'http://localhost:8088', // Utilise le proxy
    //    apiUrl: "https://api-gateway.test.qualisira.com",
=======
    // Vide : les appels partent en chemin relatif et c'est le proxy de « ng serve »
    // (proxy.conf.json) qui les porte vers la passerelle locale, sur le port 8088.
    // Mettre ici une adresse absolue — celle du serveur de test, par exemple — court-circuite
    // le proxy : le navigateur parle alors au serveur distant, et la pile locale ne voit rien.
    apiUrl: "",
>>>>>>> ba65025c3871ce255b62b09f7ca4aa781b72a0e6
};
