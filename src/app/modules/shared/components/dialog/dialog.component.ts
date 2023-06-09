import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  EventEmitter,
  Input,
  OnInit,
  Output,
  Type,
  ViewChild,
  ViewContainerRef
} from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styles: []
})
export class DialogComponent<T> implements OnInit, AfterViewInit {
  @Input() options = new DialogBoxOptions();
  @Output() okPressed = new EventEmitter<void>();
  @Output() cancelPressed = new EventEmitter<void>();

  @ViewChild('content', { read: ViewContainerRef }) container;

  componentRef: any = null;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.container.clear();
    const factory: ComponentFactory<any> = this.componentFactoryResolver.resolveComponentFactory(
      this.options.component
    );
    this.componentRef = this.container.createComponent(factory);
    for (const key in this.options.inputs) {
      if (this.options.inputs.hasOwnProperty(key)) {
        this.componentRef.instance[key] = this.options.inputs[key];
      }
    }
    // provide the view a reference to it's parent
    this.componentRef.instance.parentRef = this;
    this.changeDetectorRef.detectChanges();
  }

  pressOK() {
    if (this.componentRef.instance.onExit) {
      this.componentRef.instance.onExit();
    }
    this.okPressed.emit();
  }

  pressCancel() {
    if (this.componentRef.instance.onExit) {
      this.componentRef.instance.onExit();
    }
    this.cancelPressed.emit();
  }

  setTitle(title: string) {
    this.options.title = title;
  }
}

export class DialogBoxOptions {
  component: Type<any>;
  inputs: any;
  active = true;
  title = '';
  message = '';
  cancelText = null;
  okText = 'OK';
}
