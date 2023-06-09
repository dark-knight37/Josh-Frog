import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { ActivatedRoute } from '@angular/router';

import {
  faChevronCircleRight,
  faInventory,
  faSearch,
  faSpinnerThird
} from '@fortawesome/pro-duotone-svg-icons';

import { DialogService } from '../../../shared/services/dialog.service';
import { WarehouseService } from '../../../shared/services/warehouse.service';
import { BarcodeService } from '../../../shared/services/barcode.service';

import {
  InventoryDetails,
  InventoryGetDetailsGQL,
  InventorySetDetailsGQL,
  SimpleProductClearBinGQL,
  SimpleProductEntity,
  SimpleProductFindByBinGQL,
  SimpleProductFindBySkuGQL,
  SimpleProductFindByUpcGQL,
  SimpleProductInfoGQL,
  SimpleProductSetBinGQL,
  WarehouseEntity
} from '../../../../../generated/graphql';
import { DialogBoxOptions } from '../../../shared/components/dialog/dialog.component';
import { ChangeBinComponent } from '../../dialogs/change-bin/change-bin.component';
import {
  SearchService,
  SearchType
} from '../../../shared/services/search.service';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styles: []
})
export class InventoryComponent implements OnInit, OnDestroy {
  faSpinnerThird = faSpinnerThird;
  faSearch = faSearch;
  faInventory = faInventory;
  faChevronCircleRight = faChevronCircleRight;

  quantityEntry: number;
  quantityUpdated: number;

  upc = '';
  sku = '';
  bin = '';

  warehouse: WarehouseEntity = null;
  warehouseChangedSubscription: Subscription;
  warehouseValid: boolean;

  inventoryLoading = false;
  loading = 0;
  upcScannedSubscription: Subscription;
  skuScannedSubscription: Subscription;
  binScannedSubscription: Subscription;
  searchDataSubscription: Subscription;

  inventoryDetails: InventoryDetails;
  simpleProduct: SimpleProductEntity;
  //TODO: Add SearchType.BIN when it is hooked up
  searchTypes = [SearchType.SKU, SearchType.TITLE];

  constructor(
    private route: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private dialogService: DialogService,
    private warehouseService: WarehouseService,
    private barcodeService: BarcodeService,
    private searchService: SearchService,
    private simpleProductInfo: SimpleProductInfoGQL,
    private simpleProductFindByUpcGQL: SimpleProductFindByUpcGQL,
    private simpleProductFindBySkuGQL: SimpleProductFindBySkuGQL,
    private simpleProductFindByBinGQL: SimpleProductFindByBinGQL,
    private inventoryGetDetailsGQL: InventoryGetDetailsGQL,
    private inventorySetDetailsGQL: InventorySetDetailsGQL,
    private simpleProductSetBinGQL: SimpleProductSetBinGQL,
    private simpleProductClearBinGQL: SimpleProductClearBinGQL
  ) {}

  ngOnInit() {
    this.searchService.clearSearchData();
    this.searchDataSubscription = this.searchService.dataUpdated.subscribe(() =>
      this.changeDetectorRef.detectChanges()
    );

    this.warehouseChangedSubscription = this.warehouseService.warehouseChanged$.subscribe(
      (warehouse) => {
        this.warehouse = warehouse;
        if (this.simpleProduct) {
          this.getInventory();
        } else {
          this.route.queryParams.subscribe(
            (params) => {
              if (params.id) {
                this.load(params.id);
              }
            },
            (error) => {}
          );
        }
      }
    );

    this.upcScannedSubscription = this.barcodeService.upcScanned$.subscribe(
      (upc) => {
        this.upc = upc;
        if (this.upc) {
          this.loading++;
          this.changeDetectorRef.detectChanges();
          this.simpleProductFindByUpcGQL
            .fetch({ upc: this.upc })
            .pipe(map((result) => result.data.simpleProductFindByUpc))
            .subscribe(
              (result) => {
                this.simpleProduct = result as SimpleProductEntity;
                this.loading--;
                this.quantityUpdated = null;
                this.quantityEntry = null;
                this.getInventory();
                this.changeDetectorRef.detectChanges();
              },
              (error) => {
                console.error(error);
                this.loading--;
                this.inventoryDetails = null;
                this.dialogService.showErrorMessageBox(error);
                this.changeDetectorRef.detectChanges();
              }
            );
        }
      }
    );

    this.skuScannedSubscription = this.barcodeService.skuScanned$.subscribe(
      (sku) => {
        this.sku = sku;
        if (this.sku) {
          this.loading++;
          this.changeDetectorRef.detectChanges();
          this.simpleProductFindBySkuGQL
            .fetch({ sku: this.sku })
            .pipe(map((result) => result.data.simpleProductFindBySku))
            .subscribe(
              (result) => {
                this.simpleProduct = result as SimpleProductEntity;
                this.loading--;
                this.quantityUpdated = null;
                this.quantityEntry = null;
                this.getInventory();
                this.changeDetectorRef.detectChanges();
              },
              (error) => {
                console.error(error);
                this.loading--;
                this.inventoryDetails = null;
                this.dialogService.showErrorMessageBox(error);
                this.changeDetectorRef.detectChanges();
              }
            );
        }
      }
    );

    this.binScannedSubscription = this.barcodeService.binScanned$.subscribe(
      (bin) => {
        this.bin = bin;
        if (this.bin) {
          this.loading++;
          this.changeDetectorRef.detectChanges();
          this.simpleProductFindByBinGQL
            .fetch({ warehouse: this.warehouse.name, binId: this.bin })
            .pipe(map((result) => result.data.simpleProductFindByBin))
            .subscribe(
              (result) => {
                this.simpleProduct = result as SimpleProductEntity;
                this.quantityUpdated = null;
                this.quantityEntry = null;
                this.loading--;
                this.changeDetectorRef.detectChanges();
                this.getInventory();
                this.changeDetectorRef.detectChanges();
              },
              (error) => {
                console.error(error);
                this.loading--;
                this.inventoryDetails = null;
                this.dialogService.showErrorMessageBox(error);
                this.changeDetectorRef.detectChanges();
              }
            );
        }
      }
    );
  }

  load(id: string) {
    //console.log('load');
    this.loading++;
    this.changeDetectorRef.detectChanges();
    this.simpleProductInfo
      .fetch({ id })
      .pipe(map((result) => result.data.simpleProductInfo))
      .subscribe(
        (result) => {
          this.simpleProduct = result as SimpleProductEntity;
          this.loading--;
          this.quantityUpdated = null;
          this.quantityEntry = null;
          this.getInventory();
          this.changeDetectorRef.detectChanges();
        },
        (error) => {
          console.error(error);
          this.loading--;
          this.inventoryDetails = null;
          this.dialogService.showErrorMessageBox(error);
          this.changeDetectorRef.detectChanges();
        }
      );
  }

  getInventory() {
    this.inventoryDetails = null;
    this.warehouseValid = !!this.simpleProduct.warehouses.find(
      (w) => w.id === this.warehouse.id
    );
    this.inventoryLoading = true;
    this.inventoryGetDetailsGQL
      .mutate({ warehouse: this.warehouse.name, id: this.simpleProduct.id })
      .pipe(map((result) => result.data.inventoryGetDetails))
      .subscribe(
        (result) => {
          this.inventoryDetails = result as InventoryDetails;
          this.inventoryLoading = false;
          this.changeDetectorRef.detectChanges();
        },
        (error) => {
          this.inventoryDetails = null;
          this.inventoryLoading = false;
          this.dialogService.showErrorMessageBox(error);
          this.changeDetectorRef.detectChanges();
        }
      );
  }

  setInventory(quantity: number) {
    // TODO: when this is returned from server, don't calculate here
    /*
    this.inventoryDetails.warehouseQuantityOnShelf = this.quantityUpdated;
    this.inventoryDetails.warehouseQuantityAvailable =
      this.inventoryDetails.warehouseQuantityOnShelf -
      this.inventoryDetails.warehouseQuantityUnshipped;
    */
    // and remove the TODO below
    this.inventoryDetails = null;
    this.inventoryLoading = true;
    this.inventorySetDetailsGQL
      .mutate({
        warehouse: this.warehouse.name,
        id: this.simpleProduct.id,
        quantity
      })
      .pipe(map((result) => result.data.inventorySetDetails))
      .subscribe(
        (result) => {
          this.quantityUpdated = quantity;
          this.inventoryDetails = result as InventoryDetails;
          this.inventoryLoading = false;
          this.changeDetectorRef.detectChanges();
        },
        (error) => {
          this.inventoryDetails = null;
          this.inventoryLoading = false;
          this.dialogService.showErrorMessageBox(error);
          this.changeDetectorRef.detectChanges();
        }
      );
  }

  showChangeBinDialog(binEntry: string) {
    this.ngZone.run(() => {
      const options = new DialogBoxOptions();
      options.component = ChangeBinComponent;
      options.inputs = {
        binEntry,
        simpleProduct: this.simpleProduct,
        setCallback: (bin: string) => {
          this.setBin(bin);
        },
        clearCallback: () => {
          this.clearBin();
        }
      };
      options.title = this.simpleProduct.title;
      options.okText = 'Cancel';
      this.dialogService.showDialog(options);
    });
  }

  setBin(bin: string) {
    this.simpleProductSetBinGQL
      .mutate(
        {
          warehouse: this.warehouse.name,
          id: this.simpleProduct.id,
          bin
        },
        { update: (cache) => cache.evict(this.simpleProduct.id) }
      )
      .pipe(map((result) => result.data.simpleProductSetBin))
      .subscribe(
        (result) => {
          this.simpleProduct = result as SimpleProductEntity;
          this.changeDetectorRef.detectChanges();
        },
        (error) => {
          this.dialogService.showErrorMessageBox(error);
          this.changeDetectorRef.detectChanges();
        }
      );
  }

  clearBin() {
    this.simpleProductClearBinGQL
      .mutate(
        {
          warehouse: this.warehouse.name,
          id: this.simpleProduct.id
        },
        { update: (cache) => cache.evict(this.simpleProduct.id) }
      )
      .pipe(map((result) => result.data.simpleProductClearBin))
      .subscribe(
        (result) => {
          this.simpleProduct = result as SimpleProductEntity;
          this.changeDetectorRef.detectChanges();
        },
        (error) => {
          this.dialogService.showErrorMessageBox(error);
          this.changeDetectorRef.detectChanges();
        }
      );
  }

  ngOnDestroy(): void {
    this.warehouseChangedSubscription.unsubscribe();
    this.upcScannedSubscription.unsubscribe();
    this.skuScannedSubscription.unsubscribe();
    this.binScannedSubscription.unsubscribe();
    this.searchDataSubscription.unsubscribe();
  }
}
