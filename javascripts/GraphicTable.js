var GraphicTable = {};

/**
 * the GraphicTable object is a grid drawn onto a canvas and can have more
 * pages. It handles cell's content and mouse events.
 * 
 * @class GraphicTable
 * @constructor
 * @extends GraphicContainer
 * 
 * @param width
 *            {number} The width of the table
 * @param height
 *            {number} The height of the table
 * @param columns
 *            {number} How many columns
 * @param row
 *            {number} How many rows
 * @param n_of_pages
 *            {number} How many pages has the table (default: 1)
 */
(function() {
	GraphicTable = function(width, height, columns, rows, n_of_pages) {

		if ((typeof columns !== 'number') || (typeof rows !== 'number')) {
			throw "Columns and rows are mandatory for GraphicTable creation";
		}

		if (width === 0 || height === 0) {
			console.warn("GraphicTable: creating a table with zero size! Sizes " + width + " x " + height);
		}

		GraphicContainer.call(this, width, height);

		pages = n_of_pages || 1;

		this.foreSize = this.size;
		this.tableMarginPercent = {};
		this.textures = {};
		this.gridSize = {};
		this.grid = [];
		this.pages = [];
		this.active = {
			page : 0
		}
		this.objects['cells'] = [];
		this.objects['table'] = {
			pixiElement : this.stage
		};
		this.cellRatio = 1;

		this.backgroundContainer = new PIXI.DisplayObjectContainer();
		this.stage.addChild(this.backgroundContainer);

		this.setLayout(columns, rows, pages);

	}

	// constructor
	GraphicTable.prototype = Object.create(GraphicContainer.prototype);
	GraphicTable.prototype.constructor = GraphicTable;

	GraphicTable.prototype.setLayout = function(columns, rows, pages) {

		this.gridSize.columns = columns;
		this.gridSize.rows = rows;

		for ( var p = 0; p < pages; p += 1) {
			var newP = this.addPage();
		}

		this.goToPage(this.active.page);

		this.recalculateCellSize();
	}

	GraphicTable.prototype.addOrRemElement = function(elmType, add) {
		var _c = this.gridSize.columns;
		var _r = this.gridSize.rows;
		this.cleanTable();
		if (elmType === 'col') {
			_c = (add === true) ? (_c + 1) : (_c - 1);
		} else {
			_r = (add === false) ? (_r + 1) : (_r - 1);
		}
		// TODO pages here
		this.setLayout(_c, _r, 1);
	}

	GraphicTable.prototype.addColumn = function(cbk) {
		this.addOrRemElement('col', true);
		this.redraw(cbk);
	}

	GraphicTable.prototype.remColumn = function(cbk) {
		this.addOrRemElement('col', false);
		this.redraw(cbk);
	}

	GraphicTable.prototype.addRow = function(cbk) {
		this.addOrRemElement('row', true);
		this.redraw(cbk);
	}

	GraphicTable.prototype.remRow = function(cbk) {
		this.addOrRemElement('row', false);
		this.redraw(cbk);
	}

	GraphicTable.prototype.cleanTable = function() {
		var p = this.pages.length;
		while (p > 0) {
			p -= 1;
			this.removePage(p);
		}
		this.removeAllChildren(this.backgroundContainer);
		console.log("GraphicTable: current stage content is ", this.stage.children);
	}

	GraphicTable.prototype.removePage = function(index) {
		if (index < this.pages.length || index === undefined) {
			this.container.visible = false;
			try {
				this.stage.removeChild(this.pages[index].container);
			} catch (e) {
				console.error("GraphicTable error : pixi couldn't remove element from stage ", e);
			}
			this.pages.splice(index, 1);
		} else {
			console.error("GraphicTable error : Trying removePage(index) to illegal page number. Index: ", index);
		}
	}

	// each page is built by its own grid and the graphic container
	GraphicTable.prototype.addPage = function() {
		var newGrid = [];
		for ( var c = 0; c <= this.gridSize.columns; c += 1) {
			newGrid[c] = [];
			for ( var r = 0; r <= this.gridSize.rows; r += 1) {
				newGrid[c][r] = {
					content : {},
					isEmpty : true,
					pixiElement : false,
					childrenIndex : false,
					textLabel : "",
					position : {
						column : c,
						row : r
					}
				}
			}
		}
		var np = {
			container : new PIXI.DisplayObjectContainer(),
			grid : newGrid
		}

		np.container.interactive = true;

		that.pages.push(np);
		// this.stage.addChild(np.container);
		return (that.pages.length - 1);
	}

	GraphicTable.prototype.goToPage = function(index) {

		if (index < this.pages.length || index === undefined) {

			if (this.container !== undefined && this.container.parent === this.stage) {
				this.container.visible = false;
				this.stage.removeChild(this.container);
			}

			this.grid = this.pages[index].grid;
			this.container = this.pages[index].container;
			this.stage.addChild(this.container);
			this.container.visible = true;
			this.active.page = index;

		} else {

			console.error("GraphicTable error : Trying goToPage(index) to illegal page number. Index: ", index);

		}

	}

	GraphicTable.prototype.isIn = function(point) {

		if ((point.x < (that.cellSize.width / 2)) || (Math.abs(point.x - that.size.width) < (that.cellSize.width / 2))
				|| (point.y < (that.cellSize.height / 2)) || (Math.abs(point.y - that.size.height) < (that.cellSize.width / 2))) {
			return false;
		} else {
			return true;
		}

	}

	GraphicTable.prototype.repositionAndResizeSprite = function(sprite, col, row) {
		sprite.position = new PIXI.Point((this.outerCellSize.width * col) + (this.outerCellSize.width / 2)
				+ ((this.size.width - this.foreSize.width) / 2), (this.outerCellSize.height * row)
				+ (this.outerCellSize.height / 2) + ((this.size.height - this.foreSize.height) / 2));
		var ratio = sprite.width / sprite.height;

		if (sprite.width > sprite.height) {
			sprite.width = this.cellSize.width;
			sprite.height = sprite.width / ratio;
		} else {
			sprite.height = this.cellSize.height;
			sprite.width = sprite.height * ratio;
		}
	}

	GraphicTable.prototype.setCellContent = function(col, row, img, content) {

		if (this.pages.length === 1) {
			var page = this.pages[0];
		} else {
			var page = this.pages[Math.floor(col / this.gridSize.columns)];
			col = col % this.gridSize.columns;
		}

		if ((page !== undefined) && (row <= this.gridSize.rows)) {

			var sprite;

			if (typeof img === 'string') {
				// just one sprite
				sprite = new PIXI.Sprite(this.getTexture(img));
				sprite.anchor = new PIXI.Point(0.5, 0.5);

				this.repositionAndResizeSprite(sprite, col, row);

				sprite.setInteractive(true);
				var pe = page.grid[col][row].pixiElement;

				// if cell already has an image and is child of the container,
				// hide it and remove
				if ((pe !== undefined) && (pe.parent === this.container)) {
					pe.visible = false;
					page.container.removeChild(pe);
				}

				if ($.isEmptyObject(content) || content === false) {
					page.grid[col][row].content = {};
					page.grid[col][row].isEmpty = true;
				} else {
					this.objects.cells.push(page.grid[col][row]);
					page.grid[col][row].content = content;
					page.grid[col][row].isEmpty = false;
				}
				page.grid[col][row].pixiElement = sprite;
				page.grid[col][row].textLabel = img;
				page.container.addChild(sprite);

			} else {
				// 'img' is a valid DisplayObjectContainer
				if (img) {
					img.pivot = new PIXI.Point(0.5, 0.5);
					this.repositionAndResizeSprite(img, col, row);
					img.setInteractive(true);
					var pe = page.grid[col][row].pixiElement;
					// if cell already has an image and is child of the
					// container,
					// hide it and remove
					if ((pe !== undefined) && (pe.parent === this.container)) {
						pe.visible = false;
						page.container.removeChild(pe);
					}
					if ($.isEmptyObject(content) || content === false) {
						page.grid[col][row].content = {};
						page.grid[col][row].isEmpty = true;
					} else {
						this.objects.cells.push(page.grid[col][row]);
						page.grid[col][row].content = content;
						page.grid[col][row].isEmpty = false;
					}
					page.grid[col][row].pixiElement = img;
					console.log("AGGIUNGO -> " + col + " x " + row + " con ", page.grid[col][row].pixiElement);
					page.container.addChild(img);
					sprite = img;
				} else {
					// nothing, don't draw
					console.error("GraphicTable: couldn't find valid graphic object. ", img);
				}
			}

			return (sprite);

		} else {

			console.warn("GraphicTable error : Trying setCellContent() to illegal position. Col: ", col, " Row: ", row, " Page ",
					page);

		}

	}

	GraphicTable.prototype.getTablePositionFromPixel = function(point) {

		var stepX = this.foreSize.width / this.gridSize.columns;
		var stepY = this.foreSize.height / this.gridSize.rows;
		var col = (Math.floor(point.x / stepX) * (this.active.page + 1));
		var row = Math.floor(point.y / stepY);

		// filter bad values
		if (row > this.gridSize.row) {
			return false;
		} else {
			return ({
				col : col,
				row : row
			})
		}

	}

	GraphicTable.prototype.getPixelFromTablePosition = function(c, r) {
		var stepX = this.foreSize.width / this.gridSize.columns;
		var stepY = this.foreSize.height / this.gridSize.rows;
		c = c % this.gridSize.columns;
		var x = (c * stepX) + (this.cellSize.width / 2);
		var y = (r * stepX) + (this.cellSize.height / 2);
		return ({
			x : x,
			y : y
		})
	}

	GraphicTable.prototype.redraw = function(callback) {
		// console.log("REDRAWING: "+this.gridSize.columns+" x "+r);
		for ( var c = 0; c < this.gridSize.columns; c += 1) {
			for ( var r = 0; r < this.gridSize.rows; r += 1) {
				console.log("ridisegno -> " + c + " x " + r + " con ", this.grid[c][r].pixiElement);
				this.setCellContent(c, r, this.grid[c][r].pixiElement, this.grid[c][r].content);
			}
		}
		if (callback !== undefined) {
			callback.bind(this)();
		}
	}

	GraphicTable.prototype.resizeTable = function(width, height) {

		this.resizeGraphicContainer(width, height);
		this.setTableMarginPercent(this.tableMarginPercent.horizontal, this.tableMarginPercent.vertical);

		// redraw cells
		for ( var p = 0; p < this.pages.length; p += 1) {
			var grid = this.pages[p].grid;
			for ( var col = 0; col <= this.gridSize.columns; col += 1) {
				for ( var row = 0; row <= this.gridSize.rows; row += 1) {
					var sprite = grid[col][row].pixiElement;
					if (sprite !== undefined) {
						this.repositionAndResizeSprite(sprite, col, row);
					} else {
						console.error("GraphicTable: undefined graphic element found at ", col, row);
					}
				}
			}
		}

	}

	GraphicTable.prototype.recalculateCellSize = function() {

		var _cw = this.foreSize.width / this.gridSize.columns;
		var _ch = this.foreSize.height / this.gridSize.rows;
		if (typeof _cw !== 'number' || typeof _ch !== 'number') {
			console.warn("GraphicTable warning : foreSize or gridSize is NaN. Foresize: ", this.foresize, " Gridsize: ",
					this.gridSize);
		} else {
			this.outerCellSize = {
				width : _cw,
				height : _ch
			}
			if (_cw > _ch) {
				_cw = _ch * this.cellRatio;
			} else {
				_ch = _cw * this.cellRatio;
			}
			this.cellSize = {
				width : _cw,
				height : _ch
			}
		}
	}

	GraphicTable.prototype.setTableMarginPercent = function(_hor, _ver) {

		if (typeof _hor !== 'number' || typeof _ver !== 'number') {
			console.warn("GraphicTable error : Trying to assign NaN as table percentual margin. Will fallback to 0.");
			_hor = 0;
			_ver = 0;
		}

		this.tableMarginPercent.horizontal = _hor;
		this.tableMarginPercent.vertical = _ver;

		this.foreSize = {
			width : this.size.width - ((this.size.width / 100) * this.tableMarginPercent.horizontal),
			height : this.size.height - ((this.size.height / 100) * this.tableMarginPercent.vertical)
		}

		this.recalculateCellSize();

		return (this);
	}
})()