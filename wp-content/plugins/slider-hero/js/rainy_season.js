jQuery(document).ready(function($){
 if (typeof rainy_season_mainId === 'undefined' || rainy_season_mainId === null) {
		rainy_season_mainId = mainId;
	}
var RENDERER = {
	INIT_RAIN_DROP_COUNT : 500,
	RAIN_DROP_COUNT : 2,
	HUMAN_COUNT : 10,
	COLOR : 'hsl(%hue, 20%, %luminance%)',
	HUE_OFFSET : Math.PI / 1000,
	LUMINANCE_OFFSET : Math.PI / 1500,
	
	init : function(){
		this.setParameters();
		this.reconstructMethod();
		this.createRainDrops(this.INIT_RAIN_DROP_COUNT, true);
		this.createHumans();
		this.render();
	},
	setParameters : function(){
		this.$container = $('#'+rainy_season_mainId);
		this.width = this.$container.width();
		this.height = this.$container.height();
		this.context = $('<canvas />').attr({width : this.width, height : this.height}).appendTo(this.$container).get(0).getContext('2d');
		
		this.rainDrops = [];
		this.humans = [];
		this.theta = 0;
		this.phi = 0;
	},
	reconstructMethod : function(){
		this.render = this.render.bind(this);
	},
	getRandomValue : function(range){
		return range.min + (range.max - range.min) * Math.random();
	},
	createRainDrops : function(count, toInit){
		for(var i = 0; i < count; i++){
			this.rainDrops.push(new RAIN_DROP(this.width, this.height, toInit, this));
		}
	},
	createHumans : function(){
		for(var i = 0, length = this.HUMAN_COUNT; i < length; i++){
			this.humans.push(new HUMAN(this.width, this.height, this));
		}
	},
	render : function(){
		requestAnimationFrame(this.render);
		
		this.color = this.COLOR.replace('%hue', 205 + 5 * Math.sin(this.phi));
		this.context.fillStyle = this.color.replace('%luminance', 35 + 5 * Math.sin(this.theta));
		this.context.fillRect(0, 0, this.width, this.height);
		
		for(var i = this.rainDrops.length - 1; i >= 0; i--){
			if(!this.rainDrops[i].render(this.context, false)){
				this.rainDrops.splice(i, 1);
			}
		}
		this.humans.sort(function(human1, human2){
			return human1 - human2;
		});
		for(var i = 0, length = this.humans.length; i < length; i++){
			this.humans[i].renderShadow(this.context);
		}
		for(var i = 0, length = this.humans.length; i < length; i++){
			this.humans[i].renderSubstance(this.context);
		}
		for(var i = this.rainDrops.length - 1; i >= 0; i--){
			if(!this.rainDrops[i].render(this.context, true)){
				this.rainDrops.splice(i, 1);
			}
		}
		this.createRainDrops(this.RAIN_DROP_COUNT, false);
		this.theta += this.LUMINANCE_OFFSET;
		this.theta %= Math.PI * 2;
		this.phi += this.HUE_OFFSET;
		this.phi %= Math.PI * 2;
	}
};
var RAIN_DROP = function(width, height, toInit, renderer){
	this.width = width;
	this.height = height;
	this.toInit = toInit;
	this.renderer = renderer;
	
	this.init();
};
RAIN_DROP.prototype = {
	SCALE_RANGE : {min : 0.2, max : 1},
	VELOCITY_RANGE : {min : -1.5, max : -1},
	VELOCITY_RATE : 3,
	LENGTH_RATE : 20,
	ACCELARATION_RATE : 0.01,
	VERTICAL_OFFSET_RATE : 0.04,
	FRONT_THRESHOLD : 0.8,
	REFLECTION_RADIUS_RATE : 0.02,
	COLOR : 'rgba(255, 255, 255, 0.5)',
	RADIUS_RATE : 0.2,
	THRESHOLD_RATE : 0.6,
	
	init : function(){
		this.scale = this.renderer.getRandomValue(this.SCALE_RANGE);
		this.length = this.LENGTH_RATE * this.scale;
		this.vx = this.renderer.getRandomValue(this.VELOCITY_RANGE) * this.scale;
		this.vy = this.VELOCITY_RATE * this.scale;
		this.ay = this.ACCELARATION_RATE * this.scale;
		
		this.theta = Math.atan2(this.vy, this.vx);
		
		this.offset = this.height * this.VERTICAL_OFFSET_RATE;
		this.x = this.renderer.getRandomValue({min : 0, max : this.width - this.height * Math.cos(this.theta)});
		this.y = (this.toInit ? this.renderer.getRandomValue({min : 0, max : this.height}) : 0) - this.offset;
		
		this.radius = this.length * this.REFLECTION_RADIUS_RATE;
	},
	render : function(context, toFront){
		if(toFront && this.scale < this.FRONT_THRESHOLD || !toFront && this.scale >= this.FRONT_THRESHOLD){
			return true;
		}
		context.save();
		context.strokeStyle = this.COLOR;
		
		if(this.y >= this.height * (1 - (1 - this.scale) * this.THRESHOLD_RATE) - this.offset){
			context.lineWidth = 3;
			context.globalAlpha = (1 - this.radius / this.length / this.RADIUS_RATE) * 0.5;
			context.beginPath();
			context.arc(this.x, this.y, this.radius, Math.PI, Math.PI * 2, false);
			context.stroke();
			context.restore();
			
			this.radius *= 1.05;
			
			if(this.radius > this.length * this.RADIUS_RATE){
				return false;
			}
		}else{
			context.lineWidth = 1;
			context.beginPath();
			context.moveTo(this.x, this.y);
			context.lineTo(this.x + this.length * Math.cos(this.theta), this.y + this.length * Math.sin(this.theta));
			context.stroke();
			context.restore();
			
			this.x += this.vx;
			this.y += this.vy;
			this.vy += this.ay;
		}
		return true;
	}
};
var HUMAN = function(width, height, renderer){
	this.width = width;
	this.height = height;
	this.renderer = renderer;
	
	this.init();
};
HUMAN.prototype = {
	HORIZONTAL_OFFSET : 30,
	VERTICAL_OFFSET_RATE_RANGE : {min : 0.05, max : 0.45},
	VELOCITY_OFFSET : {min : 0.3, max : 0.6},
	SHADOW_SCALE : -0.6,
	
	init : function(){
		this.setParameters(true);
	},
	setParameters : function(toInit){
		this.direction = (Math.random() < 0.5) ? 1 : -1;
		
		if(toInit){
			this.x = this.renderer.getRandomValue({min : 0, max : this.width});
		}else{
			this.x = (this.direction > 0) ? -this.HORIZONTAL_OFFSET : (this.width + this.HORIZONTAL_OFFSET);
		}
		var position = this.renderer.getRandomValue(this.VERTICAL_OFFSET_RATE_RANGE) * this.height,
			verticalPosition = this.height * this.VERTICAL_OFFSET_RATE_RANGE.max;
			
		this.rate = 10 * (verticalPosition - position) / verticalPosition | 0;
		this.y = this.height - position;
		this.vx = this.renderer.getRandomValue(this.VELOCITY_OFFSET) * this.direction;
		this.vxRate = (0.5 + 0.5 * (verticalPosition - position) / verticalPosition);
		this.theta = 0;
	},
	renderSubstance : function(context){
		context.save();
		context.translate(this.x, this.y);
		context.scale(this.direction * this.vxRate, 1 * this.vxRate);
		this.renderHuman(context, 30);
		context.restore();
		
		this.theta += this.vx / 5;
		this.theta %= Math.PI * 2;
		this.x += this.vx * this.vxRate;
		
		if(this.x < -this.HORIZONTAL_OFFSET && this.direction < 0 || this.x > this.width + this.HORIZONTAL_OFFSET && this.direction > 0){
			this.setParameters(false);
		}
	},
	renderShadow : function(context){
		context.save();
		context.translate(this.x, this.y);
		context.scale(this.direction * this.vxRate, this.SHADOW_SCALE * this.vxRate);
		this.renderHuman(context, 35);
		context.restore();
	},
	renderHuman : function(context, baseColor){
		var color = this.renderer.color.replace('%luminance', baseColor - this.rate);
		
		context.fillStyle = color;
		context.strokeStyle = color;
		context.lineWidth = 2;
		
		context.beginPath();
		context.moveTo(-30, -60);
		context.quadraticCurveTo(-20, -75, 0, -75);
		context.quadraticCurveTo(20, -75, 30, -60);
		context.closePath();
		context.fill();
		
		context.beginPath();
		context.moveTo(0, -80);
		context.lineTo(0, -35);
		context.stroke();
		
		context.beginPath();
		context.arc(-10, -55, 5, 0, Math.PI * 2, false);
		context.fill();
		
		context.beginPath();
		context.moveTo(-15, -50);
		context.quadraticCurveTo(-20, -40, -15, -30);
		context.lineTo(-5, -30);
		context.quadraticCurveTo(0, -40, -5, -50);
		context.closePath();
		context.fill();
		
		for(var i = -1; i <= 1; i += 2){
			context.beginPath();
			context.moveTo(-13, -30);
			context.lineTo(-13 + 7 * Math.sin(this.theta) * i, -5);
			context.lineTo(-3 + 7 * Math.sin(this.theta) * i, -5);
			context.lineTo(-7 + 7 * Math.sin(this.theta) * i, -10);
			context.lineTo(-7, -30);
			context.closePath();
			context.fill();
		}
	}
};
$(function(){
	RENDERER.init();
});
})