class BracketsColumn {
  constructor(name, items) {
    this.name = name;
    this.items = items;
    this.brackets = items.length > 1 ? new Array(items.length / 2) : [];
  }
}

var app = new Vue({
  el: '#app',
  data: {
    participants: [
      {value: '😀'},{value: '😃'},
      {value: '😄'},{value: '😁'},
      {value: '😆'},{value: '😅'},
      {value: '😂'},{value: '🤣'},
      {value: '🥲'},{value: '☺️'},
      {value: '😊'},{value: '😇'},
      {value: '🙂'},{value: '🙃'},
      {value: '😉'},{value: '😌'},
    ],
    columns: [],
  },
  methods: {
    buildBracketsColumn(items, colNum) {
      const colItems = [];
      const count = this.columns.map(c => c.items).flat().length;
      const pair = this.chunk(items);
      for (let i = 0; i < pair.length; i++) {
        colItems.push({
          number: count + i + 1,
          participantOne: pair[i][0], 
          participantTwo: pair[i][1],
        });
      }
      this.columns.push(
        new BracketsColumn(`Round ${colNum}`, colItems),
      );
      if (colItems.length / 2 > 0.5) {
        this.buildBracketsColumn(colItems, colNum + 1);
      }
    },
    chunk(arr) {
      if (2 <= 0) throw "Invalid chunk size";
      let R = [];
      for (let i = 0; i < arr.length; i += 2) {
        R.push(arr.slice(i, i + 2));
      }
      return R;
    },
  },
  created() {
    this.buildBracketsColumn(this.participants, 1);
  }
});
