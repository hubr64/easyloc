# EasyLoc :house: :moneybag:
Easyloc, pour vous simplifier la location

## Qu'est ce que c'est ?
Easyloc est une application de gestion de biens immobiliers en location. L'application n'apporte aucun service ou conseil dans la gestion de bien immobiliers. Vous seul êtes responsable de vos droits et devoirs en tant que propriétaire bailleur.

Pour pouvoir utiliser EasyLoc, il vous suffit de disposer d'un compte Google pleinement fonctionnel sur les services Google suivants :

- Google Drive (<a href="https://drive.google.com/">https://drive.google.com/</a>)</li>
- Google GMail (<a href="https://mail.google.com/">https://mail.google.com/</a>)</li>

Le service Google Drive est utilisé pour stocker vos données d'utilisation de l'application.
Le service Google Gmail est utilisé pour envoyer des mails depuis l'application.

## Comment y accéder ?
Easyloc étant développé en Angular et s'appuyant sur les API Goole, il est possible de l'utiliser :

- soit directement depuis Github pages (aucune donnée personnelle hébergée)
- soit être hébergé par un hébergeur compétent

## Où sont stockées mes données ?
L'application utilise votre compte Google Drive pour créer, modifier ou supprimer des fichiers.
Seuls vos fichiers sont concernés : vous ne stockerez pas les fichiers d'autres utilisateurs et aucun autre utilisateur ne pourra accéder à vos fichiers (sauf si vous utilisez la fonction de partage de fichiers mise en oeuvre par Google Drive mais que l'application ne gère pas).

Seuls les fichiers présents dans le répertoire "easyloc" sont gérés. Aucun autre fichier hors de ce répertoire ne sera utilisé y compris dans le cadre de l'utilisation de l'application. Les fichiers gérés sont les suivants :

- /easyloc/data.json : base de données d'utilisation de l'application (ne pas modifier ou déplacer)
- /easyloc/documents/ : Répertoire contenant l'ensemble des pièces jointes dans l'application.

## Librairies tierces utilisées
L'application utilise les librairies suivantes :

- Angular (<a href="https://angular.io/">https://angular.io/</a>)
- Angular Material (<a href="https://material.angular.io/">https://material.angular.io/</a>)
- Google API (<a href="https://cloud.google.com/apis/docs/overview">https://cloud.google.com/apis/docs/overview</a>)
- HTML2Canvas (<a href="https://html2canvas.hertzen.com/">https://html2canvas.hertzen.com/</a>)
- jsPDF (<a href="https://github.com/parallax/jsPDF">https://github.com/parallax/jsPDF</a>)
- eCharts (https://echarts.apache.org/)
