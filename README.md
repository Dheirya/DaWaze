# DaWaze 
A working demo is available here: https://dawaze.onrender.com/

This project was submitted for the 2025 RidgeHacks Hackathon. It won 2nd place overall. The Devpost for it is here: https://devpost.com/software/dawaze-the-routing-game

## Inspiration
We created DaWaze based on inspiration from GeoGuessr. As a pioneering geographic game, DaWaze calls for its users to stimulate the navigational side of their brain by pushing them to use their experience into creating new routes and road paths. 

## What it does
DaWaze is an exciting new game where maps and guessing games collide. In this captivating game, you will be presented with two points on a map, along with the route connecting them and the time it takes to drive between them. Your challenge is to then click on two other points on the map that you believe have a similar driving duration between them as the original route. Can you accurately gauge the driving durations and find the perfect matches? The clock is ticking, and precision is key!

## How we built it
We built the basic skeleton frontend of DaWaze previously. Today, at the hackathon, we created the backend to handle the necessary APIs and fixed various bugs with the random point selection and route generation. For the frontend, DaWaze uses JS, jQuery, HTML, CSS. For the backend, DaWaze uses Python & FastAPI. We used various APIs and libraries like OSRM and PyCountry to handle game functionality.

## What we learned + Challenges
Through the process of building DaWaze, we learned how to properly incorporate APIs so that the game could effectively process the correct drivable routes. This was initially challenging because the drivable function randomly included every possible coordinate, which was troublesome since it meant that the routes could be generated truly anywhere, including random islands across vast oceans or rivers. This made the routes inaccurate as they would cross large bodies of water. We were able to fix it by automatically moving the end points to the nearest piece of road that was able to complete the route.

## Accomplishments that we're proud of
We're proud to have successfully developed a working prototype of the game in the given time frame. We are also proud of our video documenting the game!

## What's next for DaWaze - The Routing Game
In the future, we could add different difficulties and more features, like a multiplayer mode. The possibilities for DaWaze are endless!
