# SwissTrails
This project implements Ant Colony Optimization for hiking trail points in Switzerland


Steps involved in Ant colony optimization:

   1. Initialization: We start by placing the ants on the starting point.

   2. Movement: Each ant selects a point to move to based on a probabilistic function that takes into account the pheromone level and the heuristic information. The heuristic information can be thought of as a measure of how good a particular point is.
    
   3. Updating pheromone trails: The pheromone trail on each edge is updated based on the quality of the solution found by the ant that traversed that edge.
    
   4. Termination: We stop the algorithm after a certain number of iterations or when a satisfactory solution is found.

Sources: 
https://induraj2020.medium.com/implementation-of-ant-colony-optimization-using-python-solve-traveling-salesman-problem-9c14d3114475 



Data:
https://www.geocat.ch/geonetwork/srv/api/records/95638869-ef86-4e95-ae60-20e84e8dca8c?language=eng

https://docs.geo.admin.ch/


https://www.geo.admin.ch/
https://map.geo.admin.ch/


Downloads:
https://data.geo.admin.ch/browser/index.html#/collections/ch.astra.wanderland?.language=en 

https://map.geo.admin.ch/#/map?lang=en&center=2642817.22,1270166.01&z=0.88&topic=ech&layers=ch.astra.wanderland@features=2.16:2.17:4.08:575.00:576.00:584.00&bgLayer=ch.swisstopo.pixelkarte-farbe&featureInfo=default&catalogNodes=ech


“Wanderland Schweiz” from SchweizMobil comprises the national, regional and local hiking and mountain walking routes and barrier-free trails in Switzerland and Liechtenstein. This data set is published in accordance with the Geoinformation Ordinance as part of the geo data set “Walking and hiking networks”. It is compiled in conjunction with the Federal Roads Office, FEDRO, the Swiss hiking routes, SchweizMobil and the cantons.


Source Attribution
"Bundesamt für Strassen, Kanton, Stiftung SchweizMobil"


AI Chats:
* Search for the best data source: https://chatgpt.com/share/69c98ce7-6b6c-8392-be58-d47d9e3e2705 