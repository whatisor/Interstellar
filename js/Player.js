//Debug tool
var EYES;
var KEYS = [];
var KEYSQUA = [];
var QUADS = [];
function Player()
{
  this.object = new THREE.Object3D;
  this.eyes = new THREE.OrthographicCamera(-1, 1, -1, 1, 0, 1);
 
 // EYES = this.eyes;
  this.velocity = new THREE.Vector3(0, 0, 0);
  this.eyeAngularVelocity = new THREE.Vector3;

  this.object.add(this.eyes);
  EYES = this.eyes;
  OBJ = this.object;
  this.galaxy = 0;

  this.controls = [];


   this.path = [];
    this.pathOri = [];
    this.eyesOri =[];
    lastPos = new THREE.Vector3();
    lastPosQua = new THREE.Quaternion();
    lastOri= new THREE.Quaternion();
}
Player.prototype = {

  lookAt: function(position)
  {
    this.eyes.lookAt(position);
  },

  handleInput: function()
  {
    for (var i = 0; i < this.controls.length; i++)
    {
      this.controls[i].update();
    }
  },

  step: (function() {

    var prevPosition   = new THREE.Vector3(),
        newVelocity    = new THREE.Vector3(),
        acceleration   = new THREE.Vector3(),
        gravityVector  = new THREE.Vector3(),
        direction      = new THREE.Vector3(),
        intersection   = new THREE.Vector3(),
        axis           = new THREE.Vector3(),
        rotation       = new THREE.Quaternion(),
        temp           = new THREE.Vector3(),
        ray            = new THREE.Ray();

    return function(delta) {

      var wormholePosition = Simulation.wormholePositionSize,
          wormholeSize = Simulation.wormholePositionSize.w,
          wormholeGravityRatio = Simulation.wormholeGravityRatio,
          wormholeSphere = new THREE.Sphere(wormholePosition, wormholeSize);

      if (this.velocity.lengthSq() > 0.00001)
      {

        //store last before change galaxy
        lastPos.copy(this.object.position);
        lastPosQua.copy(this.object.quaternion);
        lastOri.copy(this.eyes.quaternion);

        prevPosition.copy(this.object.position);

        // 1. Compute wormhole curvature/gravity.
        gravityVector.subVectors(wormholePosition, prevPosition);
        var rayDistance = gravityVector.length() - wormholeSize * (1 - wormholeGravityRatio);
        var amount = wormholeGravityRatio / rayDistance;
        acceleration.copy(gravityVector.normalize()).multiplyScalar(wormholeSize * this.velocity.lengthSq() * amount * amount);

        // Apply curvature to velocity
        newVelocity.copy(this.velocity).add(acceleration.multiplyScalar(delta));

        // Adjust new velocity (keep magnitude of old velocity)
        newVelocity.normalize().multiplyScalar(this.velocity.length());

        // Update the player accordingly
        this.object.position.addVectors(prevPosition, newVelocity.multiplyScalar(delta));

        // ...and orientation
        rotation.setFromUnitVectors(this.velocity.normalize(), newVelocity.normalize());
        this.object.quaternion.multiplyQuaternions(rotation, this.object.quaternion);

        this.velocity.copy(newVelocity);

        // 2. Check if we're going through the wormhole
        direction.copy(this.velocity).normalize();

        ray.set(prevPosition, direction);

        var distanceTravelledSq = direction.subVectors(this.object.position, prevPosition).lengthSq();

        var at = ray.intersectSphere(wormholeSphere, intersection);
        if (at && at.distanceToSquared(prevPosition) <= distanceTravelledSq)
        {
          // Rotate 180 degrees around axis pointing at exit point
          axis.subVectors(intersection, wormholePosition).normalize();
          rotation.setFromAxisAngle(axis, Math.PI);
          this.object.quaternion.multiplyQuaternions(rotation, this.object.quaternion);
          this.velocity.reflect(axis).multiplyScalar(-1);

          // Set new position a tiny bit outside mirrored intersection point
          this.object.position.copy(wormholePosition).add(temp.subVectors(wormholePosition, intersection).multiplyScalar(1.0001));

          this.galaxy = 1 - this.galaxy;
          


          //last one
          KEYS.push([lastPos.x,lastPos.y,lastPos.z]);
           KEYSQUA.push([lastPosQua.x,lastPosQua.y,lastPosQua.z,lastPosQua.w]);        
          QUADS.push([lastOri.x,lastOri.y,lastOri.z,lastOri.w]);



           console.log("GALAXY "+this.galaxy);
          console.log("GALAXY CHANGED AT "+KEYS.length);
          changeGalaxy = KEYS.length;
           //new one
           console.log("["+OBJ.position.x +", "+OBJ.position.y +", "+OBJ.position.z+"],");
          console.log("["+EYES.quaternion.x+","+EYES.quaternion.y +", "+EYES.quaternion.z +", "+EYES.quaternion.w+"],");
          KEYS.push([OBJ.position.x,OBJ.position.y,OBJ.position.z]);
           KEYSQUA.push([OBJ.quaternion.x,OBJ.quaternion.y,OBJ.quaternion.z,OBJ.quaternion.w]);

        }
      }

      rotation.set( this.eyeAngularVelocity.x * delta, this.eyeAngularVelocity.y * delta, this.eyeAngularVelocity.z * delta, 1 ).normalize();
     
      //if exist path, run along path
      if(this.path.length){
        if(this.timer >= this.path.length-1){
          this.galaxy=0;
          this.timer = 0;
          console.log("GALAXY "+this.galaxy);
        }
        var point = this.path[this.timer++];
        this.object.position.copy(point);
        this.object.quaternion.copy(this.pathOri[this.timer-1]);
        this.eyes.quaternion.copy(this.eyesOri[this.timer-1]);

        //this.eyes.lookAt(this.path[this.timer]);
        //console.log(this.object.position.distanceTo(positions[changeGalaxy]));
        if((this.timer===this.smooth*changeGalaxy) && this.galaxy===0){
          this.galaxy = 1 - this.galaxy;
          console.log("GALAXY "+this.galaxy);
        }
      }
      else {
         this.eyes.quaternion.multiply( rotation );
         if(KEYS.length > QUADS.length)          
          QUADS.push([EYES.quaternion.x,EYES.quaternion.y,EYES.quaternion.z,EYES.quaternion.w]);
      }
    };
  })(),

  update: function(delta)
  {
    this.handleInput();
    this.step(delta);

    // Object isn't actually part of a rendered scene, so we need to call this manually
    this.object.updateMatrixWorld(true);
  },
  //make path
  makePathSelf: function(points,positionsOri,orientations,desiredNumber){
    desiredNumber = this.smooth;
    var spline = new THREE.Spline( points );
   

    for ( i = 0; i < points.length * desiredNumber; i ++ ) {
          
          index = i / ( points.length * desiredNumber );
          var position = spline.getPoint( index );
          this.path.push(new THREE.Vector3( position.x, position.y, position.z ));
          var indexq = Math.floor(i/desiredNumber);
          //if(indexq<orientations.length-1){
          var rate = (i%desiredNumber)/desiredNumber;
          var q = new THREE.Quaternion();
          THREE.Quaternion.slerp(orientations[indexq],orientations[(indexq<orientations.length-1)?indexq+1:indexq],q,rate)
          this.eyesOri.push(q);
           var q2 = new THREE.Quaternion();
          THREE.Quaternion.slerp(positionsOri[indexq],positionsOri[(indexq<orientations.length-1)?indexq+1:indexq],q2,rate)
          this.pathOri.push(q2);
        //}
        }
    //this.pathLine = this.makeLineMesh(path,0xff0000);
  
   // this.steps = points.length;
    this.timer = 0;
  },
  makePath:function(points,positionsOri,orientations,desiredNumber){
    var points1 = points.slice(0,changeGalaxy);
    var points2 = points.slice(changeGalaxy,points.length);
    var posOri1 = positionsOri.slice(0,changeGalaxy);
    var posOri2 = positionsOri.slice(changeGalaxy,positionsOri.length);
    var ori1 = orientations.slice(0,changeGalaxy);
    var ori2 = orientations.slice(changeGalaxy,orientations.length);
    this.makePathSelf(points1,posOri1,ori1,desiredNumber)
    this.makePathSelf(points2,posOri2,ori2,desiredNumber)
  },
  ///for visualine
  makeLineMesh:function(lines,colorin){
  var len = lines.length;
  var geometry = new THREE.BufferGeometry();
  var vertices = new Float32Array(len*3);
  var colors = new Float32Array(len*3);
  var color = new THREE.Color();
  color.setHex(colorin);
  for(var i = 0; i < len*3; i+=3){
    vertices[i] = lines[i/3].x;
    vertices[i+1] = lines[i/3].y;
    vertices[i+2] = lines[i/3].z;
    colors[i] =color.r;
    colors[i+1] =color.g;
    colors[i+2] =color.b;
  }
  geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
  geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
  return new THREE.Line( geometry, new THREE.LineBasicMaterial( 
      {   color: 0xffffff, opacity: 1.0, blending: 
      THREE.AdditiveBlending, transparent:true, 
      depthWrite: false, vertexColors: true, 
      linewidth: 1 } ) 
  );
}
};
