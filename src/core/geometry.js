(function(){

    var ERROR_UNSUPPORTED_ARG = "Error: Unsupported argument";

    // Service
    Physics.geometry = Decorator('geometry', {

        // prototype methods
        init: function( options ){

        },
        
        // get axis-aligned bounding box for this object
        // to be overridden
        aabb: function(){

            return {
                halfWidth: 0,
                halfHeight: 0
            };
        },

        /**
         * Get farthest point on the hull of this geometry
         * along the direction vector "dir"
         * returns local coordinates
         * replaces result if provided
         * @param {Vector} dir Direction to look
         * @param {Vector} result (optional) A vector to write result to
         * @return {Vector} The farthest hull point in local coordinates
         */
        getFarthestHullPoint: function( dir, result ){

            result = result || Physics.vector();

            // not implemented.
            return result.set( 0, 0 );
        },

        /**
         * Get farthest point on the core of this geometry
         * along the direction vector "dir"
         * returns local coordinates
         * replaces result if provided
         * @param {Vector} dir Direction to look
         * @param {Vector} result (optional) A vector to write result to
         * @return {Vector} The farthest core point in local coordinates
         */
        getFarthestCorePoint: function( dir, result ){

            result = result || Physics.vector();

            // not implemented.
            return result.set( 0, 0 );
        }
    });

    // utility functions

    // check if polygon array is convex
    // points are assumed to wrap clockwise
    Physics.geometry.isPolygonConvex = function( hull ){

        var scratch = Physics.scratchpad()
            ,prev = scratch.vector()
            ,next = scratch.vector()
            ,tmp = scratch.vector()
            ,ret = true
            ,sign = false
            ,l = hull.length
            ;

        if ( l < 3 ){
            // it must be a point or a line...
            // which are convex
            scratch.done();
            return ret;
        }

        prev.clone( hull[ 0 ] ).vsub( tmp.clone( hull[ l - 1 ] ) );

        // loop over the edges of the hull and construct vectors of the current
        // edge and retain the last edge
        // add two to the length to do a full cycle
        for ( var i = 1; i <= l; ++i ){
            
            next.clone( hull[ i % l ] ).vsub( tmp.clone( hull[ (i - 1) % l ] ) );

            if ( sign === false ){

                // first check the sign of the first cross product
                sign = prev.cross( next );

            } else if ( (sign > 0) ^ (prev.cross( next ) > 0) ){
            
                // if the cross products are different signs it's not convex
                ret = false;
                break;
            }

            // remember the last edge
            next.swap( prev );
        }

        scratch.done();
        return ret;
    };

    // gets the moment of inertia of a 
    // convex polygon
    // see: http://en.wikipedia.org/wiki/List_of_moments_of_inertia
    // assumptions: 
    //  * mass is unitary
    //  * axis of rotation is the origin
    Physics.geometry.getPolygonMOI = function( hull ){

        var scratch = Physics.scratchpad()
            ,prev = scratch.vector()
            ,next = scratch.vector()
            ,num = 0
            ,denom = 0
            ,tmp
            ,l = hull.length
            ;

        if ( l < 2 ){
            // it must be a point
            // moi = 0
            scratch.done();
            return 0;
        }

        if ( l === 2 ){
            // it's a line
            // get length squared
            tmp = next.clone( hull[ 1 ] ).distSq( prev.clone( hull[ 0 ] ) );
            scratch.done();
            return tmp / 12;
        }

        prev.clone( hull[ 0 ] );

        for ( var i = 1; i < l; ++i ){
            
            next.clone( hull[ i ] );

            tmp = Math.abs( next.cross( prev ) );
            num += tmp * ( next.normSq() + next.dot( prev ) + prev.normSq() );
            denom += tmp;

            prev.swap( next );
        }

        scratch.done();
        return num / ( 6 * denom );
    };

    /**
     * Check if point is inside polygon hull
     * @param  {Vector-like}  pt
     * @param  {Array(Vector-likes)}  hull
     * @return {Boolean}
     */
    Physics.geometry.isPointInPolygon = function( pt, hull ){

        var scratch = Physics.scratchpad()
            ,point = scratch.vector().clone( pt )
            ,prev = scratch.vector()
            ,next = scratch.vector()
            ,ang = 0
            ,l = hull.length
            ;

        if ( l < 2 ){
            // it's a point...
            ang = point.equals( prev.clone( hull[ 0 ] ));
            scratch.done();
            return ang;
        }

        if ( l === 2 ){
            // it's a line
            ang = point.angle( prev.clone( hull[ 0 ] ));
            ang += point.angle( prev.clone( hull[ 1 ] ));
            scratch.done();
            return ( Math.abs(ang) === Math.PI );
        }

        prev.clone( hull[ 0 ] ).vsub( point );

        // calculate the sum of angles between vector pairs
        // from point to vertices
        for ( var i = 1; i <= l; ++i ){
            
            next.clone( hull[ i % l ] ).vsub( point );
            ang += next.angle( prev );
            prev.swap( next );
        }

        scratch.done();
        return ( Math.abs(ang) > 0 );
    };

    /**
     * Get the signed area of the polygon
     * @param  {Array} hull Polygon hull definition
     * @return {Number} Area (positive for clockwise ordering)
     */
    Physics.geometry.getPolygonArea = function getPolygonArea( hull ){

        var scratch = Physics.scratchpad()
            ,prev = scratch.vector()
            ,next = scratch.vector()
            ,ret = 0
            ,l = hull.length
            ;

        if ( l < 3 ){
            // it must be a point or a line
            // area = 0
            scratch.done();
            return 0;
        }

        prev.clone( hull[ l - 1 ] );

        for ( var i = 0; i < l; ++i ){
            
            next.clone( hull[ i ] );

            ret += prev.cross( next );

            prev.swap( next );
        }

        scratch.done();
        return ret / 2;
    };

    /**
     * Get the coordinates of the centroid
     * @param  {Array} hull Polygon hull definition
     * @return {Vector} centroid
     */
    Physics.geometry.getPolygonCentroid = function getPolygonCentroid( hull ){

        var scratch = Physics.scratchpad()
            ,prev = scratch.vector()
            ,next = scratch.vector()
            ,ret = Physics.vector()
            ,tmp
            ,l = hull.length
            ;

        if ( l < 2 ){
            // it must be a point
            scratch.done();
            return Physics.vector( hull[0] );
        }

        if ( l === 2 ){
            // it's a line
            // get the midpoint
            scratch.done();
            return Physics.vector((hull[ 1 ].x + hull[ 0 ].x)/2, (hull[ 1 ].y + hull[ 0 ].y)/2 );
        }

        prev.clone( hull[ l - 1 ] );

        for ( var i = 0; i < l; ++i ){
            
            next.clone( hull[ i ] );

            tmp = prev.cross( next );
            prev.vadd( next ).mult( tmp );
            ret.vadd( prev );

            prev.swap( next );
        }

        tmp = 1 / (6 * Physics.geometry.getPolygonArea( hull ));

        scratch.done();
        return ret.mult( tmp );
    };

}());