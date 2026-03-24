# SwissTrails
This project implements Ant Colony Optimization for points in Switzerland


Steps involved in Ant colony optimization:

   1. Initialization: We start by placing the ants on the starting point.

   2. Movement: Each ant selects a point to move to based on a probabilistic function that takes into account the pheromone level and the heuristic information. The heuristic information can be thought of as a measure of how good a particular point is.
    
   3. Updating pheromone trails: The pheromone trail on each edge is updated based on the quality of the solution found by the ant that traversed that edge.
    
   4. Termination: We stop the algorithm after a certain number of iterations or when a satisfactory solution is found.

Sources: 
https://induraj2020.medium.com/implementation-of-ant-colony-optimization-using-python-solve-traveling-salesman-problem-9c14d3114475 