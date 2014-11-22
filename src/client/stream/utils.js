var serialize = function(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

function uniqueArray(arr) {
	return arr.filter(function(item, pos, self) {
		return self.indexOf(item) == pos;
	});
}
