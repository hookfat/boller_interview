// 乘客類別：記錄乘客編號、起始樓層、目的樓層與產生時間
class Passenger {
    constructor(id, startFloor, destFloor, arrivalTime) {
      this.id = id;
      this.startFloor = startFloor;
      this.destFloor = destFloor;
      this.arrivalTime = arrivalTime;
    }
  }
  
  // 樓層類別：僅儲存等待乘客，不分方向
  class Floor {
    constructor(floorNumber) {
      this.floorNumber = floorNumber;
      this.waitingPassengers = [];
    }
    
    // 新增等待乘客
    addWaitingPassenger(passenger) {
      this.waitingPassengers.push(passenger);
    }
    
    // 根據電梯剩餘空間回傳可上車的乘客，並從等待隊列中移除
    getPassengersForElevator(availableSpace) {
      return this.waitingPassengers.splice(0, availableSpace);
    }
    
    // 判斷是否還有等待乘客
    hasWaitingPassengers() {
      return this.waitingPassengers.length > 0;
    }
  }
  
  // 電梯類別：只使用 targetFloors 儲存需要停靠的樓層
  class Elevator {
    constructor(id) {
      this.id = id;
      this.currentFloor = 1;
      this.direction = 'idle'; // 'up', 'down', 'idle'
      this.passengers = [];
      this.targetFloors = new Set(); // 儲存所有要停靠的樓層（包含上客與下客）
      this.serviced = false; // 當前單位時間內是否已執行上/下客
    }
    
    // 移動一層（耗時 1 秒）
    move() {
      if (this.direction === 'up') {
        this.currentFloor++;
      } else if (this.direction === 'down') {
        this.currentFloor--;
      }
    }
    
    // 停下來處理下客，若當前樓層為乘客的目的樓層，則下車
    stop() {
      const departing = this.passengers.filter(p => p.destFloor === this.currentFloor);
      if (departing.length > 0) {
        console.log(`電梯 ${this.id} 在 ${this.currentFloor} 樓放下乘客: [${departing.map(p => p.id).join(', ')}]`);
        this.passengers = this.passengers.filter(p => p.destFloor !== this.currentFloor);
        this.targetFloors.delete(this.currentFloor);
        this.serviced = true; // 標記本單位時間已進行下客服務
      }
      this.targetFloors.delete(this.currentFloor);
    }
    
    // 上客，將等待乘客全部接入（若有足夠空位）
    board(passengers) {
      const availableSpace = 5 - this.passengers.length;
      const boarding = passengers.slice(0, availableSpace);
      if (boarding.length > 0) {
        boarding.forEach(p => {
          this.passengers.push(p);
          // 將乘客的目的樓層加入內部目標
          this.targetFloors.add(p.destFloor);
          console.log(`電梯 ${this.id} 在 ${this.currentFloor} 樓接上乘客 ${p.id} (目的 ${p.destFloor})`);
        });
        this.serviced = true; // 標記本單位時間已進行上客服務
      }
    }
    
    // 更新電梯方向：若沒有 target 則 idle，否則依照最接近的 target 決定方向
    updateDirection() {
      if (this.targetFloors.size === 0) {
        this.direction = 'idle';
        return;
      }
      const targets = Array.from(this.targetFloors);
      const diff = targets.map(floor => ({ floor, dist: Math.abs(floor - this.currentFloor) }));
      diff.sort((a, b) => a.dist - b.dist);
      const nextFloor = diff[0].floor;
      this.direction = (nextFloor > this.currentFloor) ? 'up' : 'down';
    }
  }
  
  // 控制器：負責乘客產生、電梯調度與模擬主循環
  class Controller {
    constructor() {
      this.elevators = [new Elevator(1), new Elevator(2)];
      this.floors = {};
      for (let i = 1; i <= 10; i++) {
        this.floors[i] = new Floor(i);
      }
      this.time = 0;
      this.totalPassengerCount = 0;    // 產生的乘客數
      this.completedPassengers = 0;      // 完成行程的乘客數
      this.maxPassengers = 40;
      this.passengerIdSeq = 1;
    }
    
    // 每秒產生一位乘客，並直接將該乘客的起始樓層加入所有電梯的 targetFloors
    generatePassenger() {
      if (this.totalPassengerCount >= this.maxPassengers) return;
      
      let startFloor = Math.floor(Math.random() * 10) + 1;
      let destFloor;
      do {
        destFloor = Math.floor(Math.random() * 10) + 1;
      } while (destFloor === startFloor);
      
      const passenger = new Passenger(this.passengerIdSeq++, startFloor, destFloor, this.time);
      // 將乘客加入對應樓層的等待隊列
      this.floors[startFloor].addWaitingPassenger(passenger);
      
      // 產生乘客後，直接將其起始樓層加入所有電梯的 targetFloors
      this.elevators.forEach(elevator => elevator.targetFloors.add(startFloor));
      
      this.totalPassengerCount++;
      console.log(`時間 ${this.time}: 產生乘客 ${passenger.id} 於 ${startFloor} 樓 -> ${destFloor} 樓`);
    }
    
    // 當電梯停在某樓層檢查是否需要下客與上客
    assignElevators() {
      this.elevators.forEach(elevator => {
        const floor = this.floors[elevator.currentFloor];

        if (elevator.targetFloors.has(elevator.currentFloor)) {
            elevator.stop();
        }

        if (floor && floor.hasWaitingPassengers()) {
          const availableSpace = 5 - elevator.passengers.length;
          if (availableSpace > 0) {
            const boarding = floor.getPassengersForElevator(availableSpace);
            if (boarding.length > 0) {
              elevator.board(boarding);
            }
          }
        }
      });
    }
    
    // 主模擬流程：每秒進行產生乘客、下客、上客、更新方向與移動等操作
    simulate() {
      while (this.completedPassengers < this.maxPassengers && this.time < 200) {
        console.log(`\n==== 時間 ${this.time} ====`);
        
        // 重置每部電梯的服務旗標
        this.elevators.forEach(elevator => elevator.serviced = false);
        
        // 1. 產生乘客（若尚未達到 40 人次）
        this.generatePassenger();
        
        this.assignElevators();
        
        // 4. 更新每部電梯的方向，並僅對未服務過的電梯進行移動
        this.elevators.forEach(elevator => {
          elevator.updateDirection();
          if (elevator.direction !== 'idle' && !elevator.serviced) {
            elevator.move();
            console.log(`電梯 ${elevator.id} 移動到 ${elevator.currentFloor} 樓，方向：${elevator.direction}`);
          } else if (elevator.serviced) {
            console.log(`電梯 ${elevator.id} 在 ${elevator.currentFloor} 樓因服務（上/下客）而暫停移動`);
          }
        });
        
        // 5. 更新完成乘客數：計算等待樓層與車內乘客數
        let waitingCount = 0;
        for (let i = 1; i <= 10; i++) {
          waitingCount += this.floors[i].waitingPassengers.length;
        }
        const inElevators = this.elevators.reduce((sum, elevator) => sum + elevator.passengers.length, 0);
        this.completedPassengers = this.totalPassengerCount - waitingCount - inElevators;
        
        this.time++; // 時間累加 1 秒
      }
      console.log(`\n模擬結束，總耗時 ${this.time} 秒`);
    }
  }
  
  // 執行模擬
  const controller = new Controller();
  controller.simulate();
  